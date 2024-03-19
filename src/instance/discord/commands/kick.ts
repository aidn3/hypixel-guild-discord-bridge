import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('kick player out of the guild in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('reason to kick the player').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.OFFICER,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const reason: string = context.interaction.options.getString('reason', true)
    context.application.clusterHelper.sendCommandToAllMinecraft(`/g kick ${username} ${reason}`)

    await context.interaction.editReply(`Command sent to kick ${username}!`)
  }
} satisfies CommandInterface
