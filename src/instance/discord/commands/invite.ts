import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('invite')
      .setDescription('invite player to the guild in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  allowInstance: true,

  permission: Permission.HELPER,
  handler: async function (context) {
    await context.interaction.deferReply()

    const username: string = context.interaction.options.getString('username', true)
    const command = `/g invite ${username}`

    const instance: string | null = context.interaction.options.getString('instance')
    if (instance == undefined) {
      context.application.clusterHelper.sendCommandToAllMinecraft(command)
    } else {
      context.application.clusterHelper.sendCommandToMinecraft(instance, command)
    }

    await context.interaction.editReply(`Command sent to invite ${username}!`)
  }
} satisfies CommandInterface
