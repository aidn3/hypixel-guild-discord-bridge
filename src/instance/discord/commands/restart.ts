import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'
import type DiscordInstance from '../discord-instance'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('restart').setDescription('Send signal to restart the bridge'),
  allowInstance: false,
  permission: Permission.ADMIN,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    clientInstance.app.emit('shutdownSignal', {
      localEvent: true,
      // undefined is used to set the command globally
      targetInstanceName: undefined,
      restart: true
    })
    clientInstance.logger.info(
      'Client will shutdown. It may not restart if process monitor is not used to auto restart it.'
    )
    await interaction.editReply(
      'Restart signal has been sent.\n' + 'It will take some time for the bridge to restart.\n'
    )
  }
} satisfies CommandInterface
