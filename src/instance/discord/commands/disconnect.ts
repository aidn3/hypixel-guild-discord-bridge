import { SlashCommandBuilder } from 'discord.js'

import { InstanceSignalType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('disconnect').setDescription('disconnect minecraft clients'),
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Required,
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const targetInstance: string = context.interaction.options.getString('instance', true)

    context.application.emit('instanceSignal', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: [targetInstance],
      type: InstanceSignalType.Shutdown
    })
    await context.interaction.editReply('disconnect signal has been sent!')
  }
} satisfies DiscordCommandHandler
