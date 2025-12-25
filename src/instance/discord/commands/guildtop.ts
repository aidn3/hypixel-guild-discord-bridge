import type { APIEmbed } from 'discord.js'
import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'
import type { Guild, GuildMember } from 'hypixel-api-reborn'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

const MaxResults = 10
const MaxDays = 7

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('guildtop')
      .setDescription('Show the top guild members by guild experience')
      .addIntegerOption((option) =>
        option.setName('days').setDescription('Number of days to count (1-7)').setMinValue(1).setMaxValue(MaxDays)
      )
      .addStringOption((option) => option.setName('guild-name').setDescription('Hypixel Guild name')),

  handler: async function (context) {
    await context.interaction.deferReply()

    const days = context.interaction.options.getInteger('days') ?? undefined
    const guildName = context.interaction.options.getString('guild-name') ?? undefined

    const guild = await resolveGuild(context, guildName)
    if (!guild) {
      await context.interaction.editReply(
        guildName
          ? `Could not find the guild \`${escapeMarkdown(guildName)}\`.`
          : 'No Minecraft bots are connected. Provide a guild name to use this command.'
      )
      return
    }

    const members = guild.members
      .map((member) => ({ member, exp: getGuildExperience(member, days) }))
      .sort((a, b) => b.exp - a.exp)
      .slice(0, MaxResults)

    const results: { rank: number; username: string; exp: number }[] = []
    for (const [index, entry] of members.entries()) {
      const profile = await context.application.mojangApi.profileByUuid(entry.member.uuid).catch(() => undefined)
      const username = profile?.name ?? entry.member.uuid
      results.push({ rank: index + 1, username: username, exp: entry.exp })
    }

    await context.interaction.editReply({ embeds: [createEmbed(guild, results, days)] })
  }
} satisfies DiscordCommandHandler

function getGuildExperience(member: GuildMember, days?: number): number {
  if (!days || days <= 0) return member.weeklyExperience ?? 0

  if (!member.expHistory || member.expHistory.length === 0) return member.weeklyExperience ?? 0

  const sortedHistory = [...member.expHistory].sort((a, b) => b.date.getTime() - a.date.getTime())
  return sortedHistory.slice(0, Math.min(days, sortedHistory.length)).reduce((total, entry) => total + entry.exp, 0)
}

function createEmbed(
  guild: Guild,
  results: { rank: number; username: string; exp: number }[],
  days?: number
): APIEmbed {
  const label = days ? `Last ${days} day${days === 1 ? '' : 's'}` : 'Weekly'
  const description =
    results.length === 0
      ? 'No guild members found.'
      : results
          .map(
            (entry) =>
              `\`${entry.rank}.\` **${escapeMarkdown(entry.username)}** - ` + `\`${entry.exp.toLocaleString()}\` GEXP`
          )
          .join('\n')

  return {
    color: Color.Default,
    title: `${guild.name} Top ${MaxResults} (${label})`,
    description,
    footer: {
      text: DefaultCommandFooter
    }
  }
}

async function resolveGuild(
  context: Parameters<DiscordCommandHandler['handler']>[0],
  guildName: string | undefined
): Promise<Guild | undefined> {
  if (guildName) {
    try {
      return await context.application.hypixelApi.getGuild('name', guildName)
    } catch (error: unknown) {
      context.logger.error('Error fetching guild by name:', error)
      return undefined
    }
  }

  const bots = context.application.minecraftManager.getMinecraftBots()
  if (bots.length === 0) return undefined

  try {
    return await context.application.hypixelApi.getGuild('player', bots[0].uuid)
  } catch (error: unknown) {
    context.logger.error('Error fetching guild by bot:', error)
    return undefined
  }
}
