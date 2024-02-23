import { APIEmbed, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import DiscordInstance from '../DiscordInstance'
import { escapeDiscord } from '../../../util/DiscordMessageUtil'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import { InstanceType, MinecraftRawChatEvent } from '../../../common/ApplicationEvent'
import Application from '../../../Application'
import { ColorScheme, DefaultCommandFooter } from '../common/DiscordConfig'
import { DEFAULT_TIMEOUT, interactivePaging } from '../../../util/DiscordPager'

function formatEmbed(guildLog: GuildLog | undefined, targetInstance: string, soleInstance: boolean): APIEmbed {
  let result = ''
  let pageTitle = ''

  if (!soleInstance) {
    result +=
      `_Warning: More than one Minecraft instance detected._\n` +
      `_Since no particular instance has been selected, ${targetInstance} will be used._\n` +
      `_You can select an instance via the optional command argument._\n\n`
  }

  result += `**${escapeDiscord(targetInstance)}**\n`
  if (guildLog) {
    pageTitle = ` (Page ${guildLog.page} of ${guildLog.total})`
    for (const entry of guildLog.entries) {
      result += `- <t:${entry.time}>: ${entry.line}\n`
    }
  } else {
    result += `_Could not fetch information for ${targetInstance}._`
  }

  return {
    color: ColorScheme.DEFAULT,
    title: `Guild Log Audit${pageTitle}`,
    description: result,
    footer: {
      text: DefaultCommandFooter
    }
  } as APIEmbed
}

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('log').setDescription('View guild activity logs'),
  permission: Permission.HELPER,
  allowInstance: true,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const currentPage: number = interaction.options.getNumber('page') ?? 1
    const chosenInstance: string | null = interaction.options.getString('instance')
    const instancesNames = clientInstance.app.clusterHelper.getInstancesNames(InstanceType.MINECRAFT)
    const soleInstance = instancesNames.length === 0 || !!chosenInstance
    const targetInstanceName = chosenInstance ?? (instancesNames.length > 0 ? instancesNames[0] : undefined)

    if (!targetInstanceName) {
      await interaction.editReply({
        embeds: [
          {
            title: 'Guild Log Audit',
            description:
              `No Minecraft instance exist.\n` +
              'This is a Minecraft command that displays ingame logs of a guild.\n' +
              `Check the tutorial on how to add a Minecraft account.`,
            color: ColorScheme.INFO,
            footer: {
              text: DefaultCommandFooter
            }
          }
        ]
      })
      return
    }

    await interactivePaging(interaction, currentPage - 1, DEFAULT_TIMEOUT, async (requestedPage) => {
      const guildLog = await getGuildLog(clientInstance.app, targetInstanceName, requestedPage + 1)
      return { totalPages: guildLog?.total ?? 0, embed: formatEmbed(guildLog, targetInstanceName, soleInstance) }
    })
  }
} satisfies DiscordCommandInterface

async function getGuildLog(app: Application, targetInstance: string, page: number): Promise<GuildLog | undefined> {
  let guildLog: GuildLog | undefined
  const regexLog = /-+\n\s+ (?:<<|) Guild Log \(Page (\d+) of (\d+)\) (?:>>|)\n\n([\W\w]+)\n-+/g

  const chatListener = function (event: MinecraftRawChatEvent): void {
    if (event.instanceName !== targetInstance || event.message.length === 0) return

    const match = regexLog.exec(event.message)
    if (match != undefined) {
      const entries: GuildLogEntry[] = []
      for (const entryRaw of match[3].trim().split('\n')) {
        const entry = entryRaw.split(':')
        entries.push({
          time: Date.parse(entry[0].trim()),
          line: entry[1].trim()
        })
      }

      guildLog = {
        page: Number(match[1]),
        total: Number(match[2]),
        entries: entries
      } satisfies GuildLog
    }
  }

  app.on('minecraftChat', chatListener)
  app.clusterHelper.sendCommandToMinecraft(targetInstance, `/guild log ${page}`)
  await new Promise((resolve) => setTimeout(resolve, 5000))
  app.removeListener('minecraftChat', chatListener)

  return guildLog
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
