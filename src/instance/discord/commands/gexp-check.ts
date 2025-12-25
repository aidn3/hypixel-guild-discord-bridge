import type { APIEmbed } from 'discord.js'
import { AttachmentBuilder, escapeMarkdown, SlashCommandBuilder } from 'discord.js'
import type { Guild } from 'hypixel-api-reborn'

import { Color, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('gexp-check')
      .setDescription('Show guild members under a weekly GEXP requirement')
      .addIntegerOption((option) =>
        option.setName('amount').setDescription('Members below this GEXP number').setMinValue(1).setRequired(true)
      )
      .addStringOption((option) => option.setName('guild-name').setDescription('Hypixel Guild name')),
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const amount = context.interaction.options.getInteger('amount', true)
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

    context.application.core.inactivity.purgeExpired()

    const below: string[] = []
    const unverified: string[] = []
    const inactive: string[] = []
    const above: string[] = []

    const sortedMembers = guild.members
      .map((member) => ({ member, exp: member.weeklyExperience ?? 0 }))
      .sort((a, b) => b.exp - a.exp)

    for (const entry of sortedMembers) {
      const username = await resolveUsername(context, entry.member.uuid)
      const safeName = escapeMarkdown(username)
      const weeklyExp = entry.exp

      const link = await context.application.core.verification.findByIngame(entry.member.uuid)
      if (!link) {
        unverified.push(`${safeName} - User not verified | ${weeklyExp.toLocaleString()}`)
        continue
      }

      const inactivity = context.application.core.inactivity.getActiveByUuid(entry.member.uuid)
      if (inactivity) {
        inactive.push(
          `${safeName} - Inactive until <t:${inactivity.expiresAt}:F> | ${escapeMarkdown(inactivity.reason)}`
        )
        continue
      }

      if (weeklyExp >= amount) {
        above.push(`${safeName} - Above requirement | ${weeklyExp.toLocaleString()}`)
        continue
      }

      below.push(`${safeName} - ${weeklyExp.toLocaleString()}`)
    }

    const belowText = formatSection(below, 'No members below requirement.')
    const skippedText =
      `Unverified Members\n${formatSection(unverified, 'None')}\n\n` +
      `Inactive Members\n${formatSection(inactive, 'None')}\n\n` +
      `Users Above Requirement\n${formatSection(above, 'None')}\n`

    const attachments = [
      new AttachmentBuilder(Buffer.from(belowText, 'utf8'), { name: 'guildExperience.txt' }),
      new AttachmentBuilder(Buffer.from(skippedText, 'utf8'), { name: 'guildExperienceSkipped.txt' })
    ]

    await context.interaction.editReply({
      embeds: [createEmbed(guild.name, amount, below.length, unverified.length, inactive.length, above.length)],
      files: attachments
    })
  }
} satisfies DiscordCommandHandler

function formatSection(lines: string[], emptyMessage: string): string {
  return lines.length > 0 ? lines.join('\n') : emptyMessage
}

function createEmbed(
  guildName: string,
  amount: number,
  belowCount: number,
  unverifiedCount: number,
  inactiveCount: number,
  aboveCount: number
): APIEmbed {
  return {
    color: Color.Default,
    title: `GEXP Check - ${guildName}`,
    fields: [
      { name: 'Requirement', value: `${amount.toLocaleString()} weekly GEXP`, inline: true },
      { name: 'Below Requirement', value: belowCount.toString(), inline: true },
      { name: 'Unverified', value: unverifiedCount.toString(), inline: true },
      { name: 'Inactive', value: inactiveCount.toString(), inline: true },
      { name: 'Above Requirement', value: aboveCount.toString(), inline: true }
    ],
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

async function resolveUsername(
  context: Parameters<DiscordCommandHandler['handler']>[0],
  uuid: string
): Promise<string> {
  const profile = await context.application.mojangApi.profileByUuid(uuid).catch(() => undefined)
  return profile?.name ?? uuid
}
