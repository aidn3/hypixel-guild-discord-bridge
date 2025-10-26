import { SlashCommandBuilder } from 'discord.js'

import { InstanceSignalType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('restart').setDescription('Send signal to restart the bridge'),
  permission: Permission.Admin,

  handler: async function (context) {
    await context.interaction.reply(
      'Restart signal will be sent.\n' + 'It will take some time for the bridge to restart.\n'
    )

    try {
      await context.application.sendSignal([context.application.instanceName], InstanceSignalType.Restart)
    } catch (error: unknown) {
      context.logger.error(error)
      await context.interaction.editReply('Failed to restart the application somehow?? Check the console for more info')
    }
  }
} satisfies DiscordCommandHandler
