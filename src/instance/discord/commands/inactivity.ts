import type { APIEmbed } from 'discord.js'
import { escapeMarkdown, MessageFlags, SlashCommandBuilder, SlashCommandStringOption, userMention } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { getDuration } from '../../../utility/shared-utility.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('inactivity')
      .setDescription('Request inactivity notice for guild staff')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('time')
          .setDescription('Time you will be inactive (e.g. 1d, 72h)')
          .setRequired(true)
      )
      .addStringOption(
        new SlashCommandStringOption().setName('reason').setDescription('Reason for inactivity').setRequired(false)
      ),

  handler: async function (context) {
    if (!context.interaction.inGuild()) {
      await context.interaction.reply({
        content: 'Use this command in a server channel.',
        flags: MessageFlags.Ephemeral
      })
      return
    }

    await context.interaction.deferReply()

    const config = context.application.getInactivityConfig()
    if (!config?.enabled) {
      await context.interaction.editReply('Inactivity requests are not enabled.')
      return
    }

    if (config.channelIds.length === 0) {
      await context.interaction.editReply('No inactivity channels are configured.')
      return
    }

    const mojangProfile = context.user.mojangProfile()
    if (!mojangProfile) {
      await context.interaction.editReply('You are not linked to a Minecraft account.')
      return
    }

    let duration
    try {
      duration = getDuration(context.interaction.options.getString('time', true).toLowerCase())
    } catch {
      await context.interaction.editReply('Please provide a valid time (e.g. 1d, 72h).')
      return
    }

    if (duration.toSeconds() <= 0) {
      await context.interaction.editReply('Please provide a time greater than 0.')
      return
    }

    if (config.maxDays > 0 && duration.toDays() > config.maxDays) {
      await context.interaction.editReply(`You can only request inactivity for ${config.maxDays} day(s) or less.`)
      return
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const expiresAt = nowSeconds + Math.floor(duration.toSeconds())
    if (expiresAt <= nowSeconds) {
      await context.interaction.editReply('Time cannot be in the past.')
      return
    }

    context.application.core.inactivity.purgeExpired()
    const existing = context.application.core.inactivity.getActiveByUuid(mojangProfile.id)
    if (existing) {
      await context.interaction.editReply({
        embeds: [createExistingEmbed(existing.expiresAt, existing.reason)]
      })
      return
    }

    const reason = context.interaction.options.getString('reason') ?? 'None'
    context.application.core.inactivity.add({
      uuid: mojangProfile.id,
      discordId: context.interaction.user.id,
      reason,
      expiresAt
    })

    const requestEmbed = createRequestEmbed({
      discordId: context.interaction.user.id,
      username: mojangProfile.name,
      reason,
      requestedAt: nowSeconds,
      expiresAt
    })

    let sent = 0
    const client = context.interaction.client
    for (const channelId of config.channelIds) {
      try {
        const channel = await client.channels.fetch(channelId)
        if (!channel?.isSendable()) continue
        await channel.send({ embeds: [requestEmbed], allowedMentions: { parse: [] } })
        sent++
      } catch (error: unknown) {
        context.logger.error(`Failed to send inactivity request to ${channelId}`, error)
      }
    }

    if (sent === 0) {
      context.application.core.inactivity.removeByUuid(mojangProfile.id)
      await context.interaction.editReply('Failed to send inactivity request to the configured channels.')
      return
    }

    await context.interaction.editReply({
      embeds: [createSuccessEmbed()]
    })
  }
} satisfies DiscordCommandHandler

function createExistingEmbed(expiresAt: number, reason: string): APIEmbed {
  return {
    color: Color.Info,
    title: 'Inactivity Request',
    description:
      `You are already inactive until <t:${expiresAt}:F> (<t:${expiresAt}:R>).\n` + `Reason: ${escapeMarkdown(reason)}`,
    footer: {
      text: DefaultCommandFooter
    }
  }
}

function createRequestEmbed(data: {
  discordId: string
  username: string
  reason: string
  requestedAt: number
  expiresAt: number
}): APIEmbed {
  return {
    color: Color.Default,
    title: 'Inactivity Request',
    description:
      `User: ${userMention(data.discordId)}\n` +
      `Username: ${escapeMarkdown(data.username)}\n` +
      `Requested: <t:${data.requestedAt}:F> (<t:${data.requestedAt}:R>)\n` +
      `Expiration: <t:${data.expiresAt}:F> (<t:${data.expiresAt}:R>)\n` +
      `Reason: ${escapeMarkdown(data.reason)}`,
    thumbnail: {
      url: `https://www.mc-heads.net/avatar/${data.username}`
    },
    footer: {
      text: DefaultCommandFooter
    }
  }
}

function createSuccessEmbed(): APIEmbed {
  return {
    color: Color.Good,
    title: 'Inactivity Request Sent',
    description: 'Your inactivity request has been sent to the guild staff.',
    footer: {
      text: DefaultCommandFooter
    }
  }
}
