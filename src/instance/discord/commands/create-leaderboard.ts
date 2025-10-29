import assert from 'node:assert'

import type { APIEmbed, CommandInteraction, SendableChannels } from 'discord.js'
import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import { Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import type { LeaderboardEntry } from '../features/leaderboard'

export const Messages30Days = { name: 'Top Messages (30 days)', value: 'messages30Days' }
export const Online30Days = { name: 'Top Online Member (30 days)', value: 'online30Days' }
export const Points30Days = { name: 'Top Activity Points (30 days)', value: 'points30Days' }

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('create-leaderboard')
      .setDescription('Create a leaderboard message in this channel')
      .addStringOption((o) =>
        o
          .setName('type')
          .setDescription('Leaderboard type')
          .setRequired(true)
          .addChoices(Messages30Days, Online30Days, Points30Days)
      )
      .addStringOption((o) => o.setName('guild-name').setDescription('Hypixel Guild name')),
  permission: Permission.Officer,

  handler: async function (context) {
    assert.ok(context.interaction.inGuild())
    const channel = context.interaction.channel
    assert.ok(channel)
    assert.ok(channel.isSendable(), 'not text based channel?')
    await context.interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const config = context.application.discordInstance.leaderboard.getConfig()
    const type = context.interaction.options.getString('type', true)
    const guildName = context.interaction.options.getString('guild-name') ?? undefined
    let guildId: string | undefined
    if (guildName !== undefined) {
      try {
        const guildData = await context.application.hypixelApi.getGuild('name', guildName)
        if (guildData === null || guildData.isRaw()) throw new Error("Something wen't wrong while fetching a guild")
        guildId = guildData.id
      } catch (error: unknown) {
        context.errorHandler.error('fetching guild id from guild-name', error)
        await context.interaction.editReply('Could not find the guild??')
        return
      }
    }

    const parameters = { addFooter: false, addLastUpdateAt: true, page: 0, guildId: guildId, user: undefined }
    let leaderboard: { embed: APIEmbed; totalPages: number } | undefined
    let entries: LeaderboardEntry[] | undefined

    switch (type) {
      case Messages30Days.value: {
        leaderboard = await context.application.discordInstance.leaderboard.getMessage30Days(parameters)
        entries = config.data.messages30Days
        break
      }

      case Online30Days.value: {
        leaderboard = await context.application.discordInstance.leaderboard.getOnline30Days(parameters)
        entries = config.data.online30Days
        break
      }

      case Points30Days.value: {
        leaderboard = await context.application.discordInstance.leaderboard.getPoints30Days(parameters)
        entries = config.data.points30Days
      }
    }

    if (leaderboard === undefined || entries === undefined) {
      throw new Error(`leaderboard type not found: ${type}`)
    }

    const messageId = await send(context.interaction, channel, leaderboard.embed)
    if (messageId === undefined) return
    entries.push({ messageId: messageId, channelId: channel.id, lastUpdate: Date.now(), guildId: guildId })
    config.markDirty()
  }
} satisfies DiscordCommandHandler

async function send(
  interaction: CommandInteraction,
  channel: SendableChannels,
  embed: APIEmbed
): Promise<string | undefined> {
  try {
    const messageId = await channel.send({ embeds: [embed] }).then((message) => message.id)
    await interaction.editReply('Leaderboard has been created.')
    return messageId
  } catch {
    await interaction.editReply(
      `Could not send the message in this channel. Give permission to <@${interaction.client.application.id}> to send messages in this channel.`
    )
    return undefined
  }
}
