import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
  SlashCommandBuilder
} from 'discord.js'

import { Color, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'
import { checkChatTriggers, KickChat } from '../../../utility/chat-triggers.js'
import { sleep } from '../../../utility/shared-utility.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('purge')
      .setDescription('Kick guild members below a GEXP threshold')
      .addIntegerOption((option) =>
        option
          .setName('gexp_threshold')
          .setDescription('Minimum GEXP to avoid being kicked')
          .setRequired(true)
          .setMinValue(0)
      )
      .addStringOption((option) =>
        option
          .setName('duration')
          .setDescription('Timeframe for GEXP evaluation')
          .setRequired(true)
          .addChoices(
            { name: 'Last 24 Hours', value: 'last_24_hours' },
            { name: 'Last 7 Days', value: 'last_7_days' },
            { name: 'Last 30 Days', value: 'last_30_days' }
          )
      )
      .addStringOption((option) =>
        option
          .setName('immune_players')
          .setDescription('Comma-separated IGNs to skip (e.g. "Player1, Player2")')
          .setRequired(false)
      ),
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Required,
  permission: Permission.Admin,

  handler: async function (context) {
    await context.interaction.deferReply()

    const gexpThreshold = context.interaction.options.getInteger('gexp_threshold', true)
    const duration = context.interaction.options.getString('duration', true)
    const immunePlayersRaw = context.interaction.options.getString('immune_players')
    const instanceName = context.interaction.options.getString('instance', true)

    // Parse immune players
    const immuneSet = new Set(
      (immunePlayersRaw ?? '')
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name.length > 0)
    )

    // Get the bot UUID for the selected instance to auto-exclude it and to fetch guild data
    const instance = context.application.minecraftManager.getAllInstances().find(i => i.instanceName === instanceName)
    const botUuid = instance?.uuid()

    if (!botUuid) {
      await context.interaction.editReply({
        embeds: [
          {
            title: 'Purge Failed',
            color: Color.Bad,
            description: `Could not determine the UUID for the instance **${instanceName}**. Is it connected?`,
            footer: { text: DefaultCommandFooter }
          }
        ]
      })
      return
    }

    const botUuids = context.application.minecraftManager.getMinecraftBots().map((bot) => bot.uuid)

    let guildMembers: { uuid: string; gexp: number }[] = []
    let totalGuildMembers = 0

    // Fetch data based on duration
    if (duration === 'last_30_days') {
      const trackerApiUrl = context.application.getConfig().general.trackerApiUrl
      if (!trackerApiUrl) {
        await context.interaction.editReply({
          embeds: [
            {
              title: 'Purge Failed',
              color: Color.Bad,
              description: 'Tracker API URL is not configured in `config.yaml`. Cannot fetch 30-day data.',
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
        return
      }

      const trackedGuild = await fetchTrackedGuild(botUuid, 'player', trackerApiUrl)
      if (!trackedGuild) {
        await context.interaction.editReply({
          embeds: [
            {
              title: 'Purge Failed',
              color: Color.Bad,
              description: 'Failed to fetch tracked guild data from the configured Tracker API.',
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
        return
      }

      const processedGuild = process30DayGexp(trackedGuild)
      totalGuildMembers = processedGuild.members.length
      guildMembers = processedGuild.members.map((m) => ({
        uuid: m.uuid.replace(/-/g, ''), // Ensure clean UUID format without dashes
        gexp: m.monthlyLast30Days ?? 0
      }))
    } else {
      const hypixelGuild = await context.application.hypixelApi.getGuildByPlayer(botUuid)
      if (!hypixelGuild) {
        await context.interaction.editReply({
          embeds: [
            {
              title: 'Purge Failed',
              color: Color.Bad,
              description: 'Failed to fetch guild data from Hypixel API.',
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
        return
      }

      totalGuildMembers = hypixelGuild.members.length
      guildMembers = hypixelGuild.members.map((member) => {
        let gexp = 0
        const historyEntries = Object.entries(member.expHistory)

        if (duration === 'last_7_days') {
          gexp = historyEntries.reduce((acc, [_, val]) => acc + val, 0)
        } else if (duration === 'last_24_hours') {
          // Keys are date strings, sorting chronologically ensures the last is the most recent
          historyEntries.sort((a, b) => a[0].localeCompare(b[0]))
          if (historyEntries.length > 0) {
            gexp = historyEntries[historyEntries.length - 1][1]
          }
        }
        return { uuid: member.uuid, gexp }
      })
    }

    // Resolve usernames
    const cachedGuildList = await context.application.core.guildManager.list(instanceName).catch(() => undefined)
    const cachedUsernames = cachedGuildList ? cachedGuildList.members.map((m) => m.username) : []
    const bulkProfiles = await context.application.mojangApi.profilesByUsername(new Set(cachedUsernames))

    const uuidToUsername = new Map<string, string>()
    for (const [username, uuid] of bulkProfiles.entries()) {
      if (uuid) {
        uuidToUsername.set(uuid.replace(/-/g, ''), username)
      }
    }

    const toKick: { uuid: string; username: string; gexp: number }[] = []

    for (const member of guildMembers) {
      let username = uuidToUsername.get(member.uuid)

      if (!username) {
        // Fallback to mojang API if not found in bulk profiles
        try {
          const profile = await context.application.mojangApi.profileByUuid(member.uuid)
          username = profile.name
        } catch {
          // If we can't resolve the username, skip them
          continue
        }
      }

      // Check immune
      if (immuneSet.has(username.toLowerCase())) {
        continue
      }

      // Check bot UUIDs
      if (botUuids.includes(member.uuid)) {
        continue
      }

      if (member.gexp < gexpThreshold) {
        toKick.push({ uuid: member.uuid, username, gexp: member.gexp })
      }
    }

    // Sort by lowest GEXP first
    toKick.sort((a, b) => a.gexp - b.gexp)

    if (toKick.length === 0) {
      await context.interaction.editReply({
        embeds: [
          {
            title: 'Purge Complete',
            color: Color.Good,
            description: `No members found below **${gexpThreshold} GEXP** (${duration}).`,
            footer: { text: DefaultCommandFooter }
          }
        ]
      })
      return
    }

    // Confirmation Preview
    const previewList = toKick.slice(0, 15).map((m) => `• **${escapeMarkdown(m.username)}**: ${m.gexp.toLocaleString()} GEXP`).join('\n')
    const remainingPreview = toKick.length > 15 ? `\n...and ${toKick.length - 15} more.` : ''

    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_purge')
      .setLabel('Confirm Purge')
      .setStyle(ButtonStyle.Danger)

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_purge')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton)

    const response = await context.interaction.editReply({
      embeds: [
        {
          title: 'Purge Confirmation',
          color: Color.Info,
          description: `**${toKick.length}** out of **${totalGuildMembers}** members are below **${gexpThreshold.toLocaleString()} GEXP** (${duration}).\n\nMembers to be kicked:\n${previewList}${remainingPreview}\n\nAre you sure you want to execute this purge?`,
          footer: { text: DefaultCommandFooter }
        }
      ],
      components: [row]
    })

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: (i) => i.user.id === context.interaction.user.id,
        time: 60_000,
        componentType: ComponentType.Button
      })

      if (confirmation.customId === 'cancel_purge') {
        await confirmation.update({
          embeds: [
            {
              title: 'Purge Cancelled',
              color: Color.Info,
              description: 'The purge operation was cancelled.',
              footer: { text: DefaultCommandFooter }
            }
          ],
          components: []
        })
        return
      }

      await confirmation.update({
        embeds: [
          {
            title: 'Purge In Progress',
            color: Color.Info,
            description: `Starting to purge **${toKick.length}** members...`,
            footer: { text: DefaultCommandFooter }
          }
        ],
        components: []
      })
    } catch {
      await context.interaction.editReply({
        embeds: [
          {
            title: 'Purge Cancelled',
            color: Color.Info,
            description: 'Confirmation timed out.',
            footer: { text: DefaultCommandFooter }
          }
        ],
        components: []
      })
      return
    }

    // Execution
    const successfulKicks: string[] = []
    const failedKicks: { username: string; reason: string }[] = []
    const kickReason = `Purge below ${gexpThreshold} GEXP (${duration})`

    let count = 0
    for (const member of toKick) {
      const command = `/g kick ${member.username} ${kickReason}`

      const result = await checkChatTriggers(
        context.application,
        context.eventHelper,
        KickChat,
        [instanceName],
        command,
        member.username
      )

      if (result.status === 'success') {
        successfulKicks.push(member.username)
      } else {
        const errorReason = result.message.length > 0 ? result.message[0].content : 'Unknown error / Timeout'
        failedKicks.push({ username: member.username, reason: errorReason })
      }

      count++
      if (count % 5 === 0 || count === toKick.length) {
        await context.interaction.editReply({
          embeds: [
            {
              title: 'Purge In Progress',
              color: Color.Info,
              description: `Kicked **${count}/${toKick.length}** members...\n\n_Please wait for the process to complete._`,
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
      }

      await sleep(1000)
    }

    // Final Summary
    let color = Color.Good
    if (failedKicks.length > 0 && successfulKicks.length > 0) color = Color.Info
    if (successfulKicks.length === 0 && failedKicks.length > 0) color = Color.Bad

    const summarySuccess = successfulKicks.length > 0 ? `**Successfully kicked (${successfulKicks.length}):**\n${successfulKicks.join(', ')}` : ''
    
    let summaryFail = ''
    if (failedKicks.length > 0) {
      summaryFail = `\n\n**Failed to kick (${failedKicks.length}):**\n` + failedKicks.map((f) => `${f.username} - _${f.reason}_`).join('\n')
    }

    let finalDescription = summarySuccess + summaryFail
    if (finalDescription.length > 4000) {
      finalDescription = finalDescription.slice(0, 4000) + '\n\n... (truncated due to length limits)'
    }

    await context.interaction.editReply({
      embeds: [
        {
          title: 'Purge Complete',
          color: color,
          description: finalDescription,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
  }
} satisfies DiscordCommandHandler

// Tracker API Utilities

interface ExpHistory {
  [date: string]: number
}

interface GuildMember {
  uuid: string
  username?: string
  rank: string
  joined: string
  expHistory: ExpHistory
  monthlyLast30Days?: number
}

interface TrackedGuild {
  _id: string
  name: string
  tag?: string
  tagColor?: string
  level: number
  members: GuildMember[]
  monthlyLast30Days?: number
}

const get30DaysAgoBoundary = (): Date => {
  const dateNow = new Date()
  return new Date(dateNow.getTime() - 30 * 24 * 60 * 60 * 1000)
}

async function fetchTrackedGuild(
  query: string,
  searchType: 'name' | 'player',
  trackerApiBaseUrl: string
): Promise<TrackedGuild | null> {
  try {
    const cleanBase = trackerApiBaseUrl.replace(/\/+$/, '')
    const url = new URL(`${cleanBase}/api/tracked/${encodeURIComponent(query)}`)
    url.searchParams.append('fetch', 'true')
    url.searchParams.append('currentMembersOnly', 'true')
    url.searchParams.append('type', searchType)

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Tracker API error: ${response.statusText}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any
    if (data.error) {
      return null
    }

    return (data.guild || data) as TrackedGuild
  } catch (error) {
    console.error('Failed to fetch tracked guild data:', error)
    return null
  }
}

function process30DayGexp(guild: TrackedGuild): TrackedGuild {
  const boundary = get30DaysAgoBoundary()
  const boundaryTime = boundary.getTime()

  guild.members.forEach((member) => {
    const historyEntries = Object.entries(member.expHistory || {})
    const sum = historyEntries
      .filter(([dateString]) => {
        const entryDate = new Date(dateString)
        return entryDate.getTime() > boundaryTime
      })
      .reduce((accumulator, [_, expValue]) => accumulator + expValue, 0)

    member.monthlyLast30Days = sum
  })

  guild.monthlyLast30Days = guild.members.reduce((acc, member) => acc + (member.monthlyLast30Days || 0), 0)

  return guild
}
