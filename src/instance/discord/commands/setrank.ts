import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('setrank')
      .setDescription('setrank guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('rank').setDescription('rank to change to').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const rank: string = context.interaction.options.getString('rank', true)

    context.application.clusterHelper.sendCommandToAllMinecraft(`/g setrank ${username} ${rank}`)
    await context.interaction.editReply(`Command sent to setrank ${username} to ${rank}!`)
  }
} satisfies CommandInterface
