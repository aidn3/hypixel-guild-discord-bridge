import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('override')
      .setDescription('execute command to all clients in-game')
      .addStringOption((option) =>
        option.setName('command').setDescription('command to execute. e.g. "/guild party"').setRequired(true)
      ) as SlashCommandBuilder,
  allowInstance: true,
  permission: Permission.ADMIN,

  handler: async function (context) {
    await context.interaction.deferReply()

    const command: string = context.interaction.options.getString('command', true)
    const instance: string | null = context.interaction.options.getString('instance')

    if (instance == undefined) {
      context.application.clusterHelper.sendCommandToAllMinecraft(command)
    } else {
      context.application.clusterHelper.sendCommandToMinecraft(instance, command)
    }

    await context.interaction.editReply(`Command executed: ${command}`)
  }
} satisfies CommandInterface
