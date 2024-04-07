import type { APIEmbed } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'

import type Application from '../../../application.js'
import type { MinecraftRawChatEvent } from '../../../common/application-event.js'
import { Severity, InstanceType } from '../../../common/application-event.js'
import { escapeDiscord } from '../../../util/shared-util.js'
import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'
import { DefaultCommandFooter } from '../common/discord-config.js'
import { DEFAULT_TIMEOUT, interactivePaging } from '../discord-pager.js'

const TITLE = 'Guild Log Audit'

function formatEmbed(chatResult: ChatResult, targetInstance: string, soleInstance: boolean): APIEmbed {
  let result = ''
  let pageTitle = ''

  if (!soleInstance) {
    result +=
      `_Warning: More than one Minecraft instance detected._\n` +
      `_Since no particular instance has been selected, ${targetInstance} will be used._\n` +
      `_You can select an instance via the optional command argument._\n\n`
  }

  result += `**${escapeDiscord(targetInstance)}**\n`
  if (chatResult.guildLog) {
    pageTitle = ` (Page ${chatResult.guildLog.page} of ${chatResult.guildLog.total})`
    for (const entry of chatResult.guildLog.entries) {
      result += `- <t:${entry.time / 1000}>: ${entry.line}\n`
    }
  } else {
    result += `_Could not fetch information for ${targetInstance}._`
    if (chatResult.error) {
      result += `\n${escapeDiscord(chatResult.error)}`
    }
  }

  return {
    color: chatResult.guildLog ? Severity.DEFAULT : Severity.INFO,
    title: `${TITLE}${pageTitle}`,
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
      .addNumberOption((option) =>
        option.setName('page').setDescription('Page to view').setMinValue(1).setMaxValue(75)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: true,

  handler: async function (context) {
    await context.interaction.deferReply()

    const currentPage: number = context.interaction.options.getNumber('page') ?? 1
    const chosenInstance: string | null = context.interaction.options.getString('instance')
    const instancesNames = context.application.clusterHelper.getInstancesNames(InstanceType.MINECRAFT)
    const soleInstance = instancesNames.length <= 1 || !!chosenInstance
    const targetInstanceName = chosenInstance ?? (instancesNames.length > 0 ? instancesNames[0] : undefined)

    if (!targetInstanceName) {
      await context.interaction.editReply({
        embeds: [
          {
            title: TITLE,
            description:
              `No Minecraft instance exist.\n` +
              'This is a Minecraft command that displays ingame logs of a guild.\n' +
              `Check the tutorial on how to add a Minecraft account.`,
            color: Severity.INFO,
            footer: {
              text: DefaultCommandFooter
            }
          }
        ]
      })
      return
    }

    await interactivePaging(context.interaction, currentPage - 1, DEFAULT_TIMEOUT, async (requestedPage) => {
      const chatResult = await getGuildLog(context.application, targetInstanceName, requestedPage + 1)
      return {
        totalPages: chatResult.guildLog?.total ?? 0,
        embed: formatEmbed(chatResult, targetInstanceName, soleInstance)
      }
    })
  }
} satisfies CommandInterface

async function getGuildLog(app: Application, targetInstance: string, page: number): Promise<ChatResult> {
  const regexLog = /-+\n\s+ (?:<< |)Guild Log \(Page (\d+) of (\d+)\)(?: >>|)\n\n([\W\w]+)\n-+/g
  return await new Promise((resolve) => {
    const result: ChatResult = {}

    const timeoutId = setTimeout(() => {
      app.removeListener('minecraftChat', chatListener)
      resolve({})
    }, 5000)

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.instanceName !== targetInstance || event.message.length === 0) return

      if (event.message.startsWith('Your guild rank does not have permission to use this')) {
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

        clearTimeout(timeoutId)
        app.removeListener('minecraftChat', chatListener)
        resolve(result)
      }
    }

    app.on('minecraftChat', chatListener)
    app.clusterHelper.sendCommandToMinecraft(targetInstance, `/guild log ${page}`)
  })
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
