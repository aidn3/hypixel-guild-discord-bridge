import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('demote')
      .setDescription('demote guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    context.application.clusterHelper.sendCommandToAllMinecraft(`/g demote ${username}`)

    await context.interaction.editReply(`Command sent to demote ${username}!`)
  }
} satisfies CommandInterface
