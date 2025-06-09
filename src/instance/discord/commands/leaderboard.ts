import assert from 'node:assert'

import { SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'

import { Messages30Days, Online30Days } from './create-leaderboard.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('display a leaderboard message in this channel')
      .addStringOption((o) =>
        o.setName('type').setDescription('Leaderboard type').setRequired(true).addChoices(Messages30Days, Online30Days)
      ),

  handler: async function (context) {
    assert(context.interaction.inGuild())
    const channel = context.interaction.channel
    assert(channel)
    assert(channel.isSendable(), 'not text based channel?')
    await context.interaction.deferReply()

    const type = context.interaction.options.getString('type', true)
    if (type === Messages30Days.value) {
      const embed = await context.application.discordInstance.leaderboard.getMessage30Days()
      await context.interaction.editReply({ embeds: [embed] })
      return
    }

    if (type === Online30Days.value) {
      const embed = await context.application.discordInstance.leaderboard.getOnline30Days()
      await context.interaction.editReply({ embeds: [embed] })
      return
    }
  }
} satisfies DiscordCommandHandler
