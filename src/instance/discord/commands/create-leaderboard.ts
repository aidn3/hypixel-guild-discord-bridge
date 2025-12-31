import assert from 'node:assert'

import type { APIEmbed, CommandInteraction, MessageActionRowComponentData, SendableChannels } from 'discord.js'
import { ComponentType, MessageFlags, SlashCommandBuilder } from 'discord.js'

import { Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import type { LeaderboardResult } from '../features/leaderboard'

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

    const type = context.interaction.options.getString('type', true)
    const guildName = context.interaction.options.getString('guild-name') ?? undefined
    let guildId: string | undefined
    if (guildName !== undefined) {
      guildId = await context.application.hypixelApi.getGuildByName(guildName).then((guild) => guild?._id)
      if (guildId === undefined) {
        await context.interaction.editReply('No such guild.')
        return
      }
    }

    const parameters = { addFooter: false, addLastUpdateAt: true, page: 0, guildId: guildId, user: undefined }
    let leaderboard: LeaderboardResult | undefined
    let leaderboardType: 'messages30Days' | 'online30Days' | 'points30Days' | undefined

    switch (type) {
      case Messages30Days.value: {
        leaderboard = await context.application.discordInstance.leaderboard.getMessage30Days(parameters)
        leaderboardType = 'messages30Days'
        break
      }

      case Online30Days.value: {
        leaderboard = await context.application.discordInstance.leaderboard.getOnline30Days(parameters)
        leaderboardType = 'online30Days'
        break
      }

      case Points30Days.value: {
        leaderboard = await context.application.discordInstance.leaderboard.getPoints30Days(parameters)
        leaderboardType = 'points30Days'
        break
      }

      default: {
        throw new Error(`leaderboard type not found: ${type}`)
      }
    }

    const messageId = await send(context.interaction, channel, leaderboard.embed, leaderboard.components)
    if (messageId === undefined) return
    context.application.core.discordLeaderboards.addOrSet({
      messageId: messageId,
      channelId: channel.id,
      type: leaderboardType,
      guildId: guildId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }
} satisfies DiscordCommandHandler

async function send(
  interaction: CommandInteraction,
  channel: SendableChannels,
  embed: APIEmbed,
  components: MessageActionRowComponentData[]
): Promise<string | undefined> {
  try {
    const messageId = await channel
      .send({ embeds: [embed], components: [{ type: ComponentType.ActionRow, components: components }] })
      .then((message) => message.id)
    await interaction.editReply('Leaderboard has been created.')
    return messageId
  } catch {
    await interaction.editReply(
      `Could not send the message in this channel. Give permission to <@${interaction.client.application.id}> to send messages in this channel.`
    )
    return undefined
  }
}
