import assert from 'node:assert'

import type { APIEmbed, CommandInteraction, SendableChannels } from 'discord.js'
import { MessageFlags, SlashCommandBuilder } from 'discord.js'

import { Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'

export const Messages30Days = { name: 'Top Messages (30 days)', value: 'messages30Days' }
export const Online30Days = { name: 'Top Online Member (30 days)', value: 'online30Days' }

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('create-leaderboard')
      .setDescription('Create a leaderboard message in this channel')
      .addStringOption((o) =>
        o.setName('type').setDescription('Leaderboard type').setRequired(true).addChoices(Messages30Days, Online30Days)
      ),
  permission: Permission.Officer,

  handler: async function (context) {
    assert(context.interaction.inGuild())
    const channel = context.interaction.channel
    assert(channel)
    assert(channel.isSendable(), 'not text based channel?')
    await context.interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const config = context.application.discordInstance.leaderboard.getConfig()
    const type = context.interaction.options.getString('type', true)
    if (type === Messages30Days.value) {
      const embed = await context.application.discordInstance.leaderboard.getMessage30Days({ addLastUpdateAt: true })
      const messageId = await send(context.interaction, channel, embed)
      if (messageId === undefined) return

      config.data.messages30Days.push({
        messageId: messageId,
        channelId: channel.id,
        lastUpdate: Date.now()
      })
      config.markDirty()
      return
    }

    if (type === Online30Days.value) {
      const embed = await context.application.discordInstance.leaderboard.getOnline30Days({ addLastUpdateAt: true })
      const messageId = await send(context.interaction, channel, embed)
      if (messageId === undefined) return

      config.data.online30Days.push({
        messageId: messageId,
        channelId: channel.id,
        lastUpdate: Date.now()
      })
      config.markDirty()
      return
    }
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
