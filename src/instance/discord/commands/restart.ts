import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('restart').setDescription('Send signal to restart the bridge'),
  allowInstance: false,
  permission: Permission.ADMIN,

  handler: async function (context) {
    await context.interaction.deferReply()

    context.application.emit('shutdownSignal', {
      localEvent: true,
      // undefined is used to set the command globally
      targetInstanceName: undefined,
      restart: true
    })
    context.logger.info('Client will shutdown. It may not restart if process monitor is not used to auto restart it.')
    await context.interaction.editReply(
      'Restart signal has been sent.\n' + 'It will take some time for the bridge to restart.\n'
    )
  }
} satisfies CommandInterface
