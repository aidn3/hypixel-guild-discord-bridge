import type { APIEmbed } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import type Application from '../../../application.js'
import type { MinecraftRawChatEvent } from '../../../common/application-event.js'
import { Color, MinecraftSendChatPriority, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'
import { Timeout } from '../../../utility/timeout'
import { DefaultCommandFooter } from '../common/discord-config.js'
import { DefaultTimeout, interactivePaging } from '../utility/discord-pager.js'

const Title = 'Guild Log Audit'

function formatEmbed(chatResult: ChatResult, targetInstance: string): APIEmbed {
  let result = ''
  let pageTitle = ''

  result += `**${escapeMarkdown(targetInstance)}**\n`
  if (chatResult.guildLog) {
    pageTitle = ` (Page ${chatResult.guildLog.page} of ${chatResult.guildLog.total})`
    for (const entry of chatResult.guildLog.entries) {
      result += `- <t:${entry.time / 1000}>: ${entry.line}\n`
    }
  } else {
    result += `_Could not fetch information for ${targetInstance}._`
    if (chatResult.error) {
      result += `\n${escapeMarkdown(chatResult.error)}`
    }
  }

  return {
    color: chatResult.guildLog ? Color.Default : Color.Info,
    title: `${Title}${pageTitle}`,
    description: result,
    footer: {
      text: DefaultCommandFooter
    }
  } as APIEmbed
}

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('log')
      .setDescription('View guild activity logs')
      .addNumberOption((option) => option.setName('page').setDescription('Page to view').setMinValue(1).setMaxValue(75))
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setAutocomplete(true)
      ),
  permission: Permission.Helper,
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Required,

  handler: async function (context) {
    await context.interaction.deferReply()

    const currentPage: number = context.interaction.options.getNumber('page') ?? 1
    const selectedUsername = context.interaction.options.getString('username') ?? undefined
    const targetInstanceName: string = context.interaction.options.getString('instance', true)

    await interactivePaging(
      context.interaction,
      currentPage - 1,
      DefaultTimeout,
      context.errorHandler,
      async (requestedPage) => {
        const chatResult = await getGuildLog(
          context.application,
          targetInstanceName,
          selectedUsername,
          requestedPage + 1
        )
        return {
          totalPages: chatResult.guildLog?.total ?? 0,
          embed: formatEmbed(chatResult, targetInstanceName)
        }
      }
    )
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

async function getGuildLog(
  app: Application,
  targetInstance: string,
  selectedUsername: string | undefined,
  page: number
): Promise<ChatResult> {
  const regexLog = /-+\n\s+ (?:<< |)Guild Log \(Page (\d+) of (\d+)\)(?: >>|)\n\n([\W\w]+)\n-+/g
  const result: ChatResult = {}

  const timeout = new Timeout<void>(5000)

  const chatListener = function (event: MinecraftRawChatEvent): void {
    if (event.instanceName !== targetInstance || event.message.length === 0) return

    if (event.message.startsWith('Your guild rank does not have permission to use this')) {
      result.error = event.message.trim()
    } else if (event.message.startsWith("Can't find a player by the name of")) {
      result.error = event.message.trim()
    }
    const match = regexLog.exec(event.message)
    if (match != undefined) {
      const entries: GuildLogEntry[] = []
      for (const entryRaw of match[3].trim().split('\n')) {
        const entry = entryRaw.split(':')
        entries.push({
          time: Date.parse(entry[0] + ':' + entry[1]),
          line: entry[2].trim()
        })
      }

      result.guildLog = {
        page: Number(match[1]),
        total: Number(match[2]),
        entries: entries
      } satisfies GuildLog

      timeout.resolve()
    }
  }

  app.on('minecraftChat', chatListener)
  await app.sendMinecraft(
    [targetInstance],
    MinecraftSendChatPriority.High,
    undefined,
    `/guild log ${selectedUsername ? selectedUsername + ' ' : ''}${page}`
  )

  await timeout.wait()
  app.off('minecraftChat', chatListener)
  return timeout.timedOut() ? {} : result
}

interface ChatResult {
  error?: string
  guildLog?: GuildLog
}

interface GuildLog {
  page: number
  total: number
  entries: GuildLogEntry[]
}

interface GuildLogEntry {
  time: number
  line: string
}
