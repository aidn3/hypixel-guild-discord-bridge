import assert from 'node:assert'

import { SlashCommandBuilder } from 'discord.js'

import { InstanceSignalType, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('reconnect').setDescription('reconnect minecraft clients'),
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Required,
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const targetInstance: string = context.interaction.options.getString('instance', true)
    assert(targetInstance)

    context.application.emit('instanceSignal', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: [targetInstance],
      type: InstanceSignalType.Restart
    })
    await context.interaction.editReply('Reconnect signal has been sent!')
  }
} satisfies DiscordCommandHandler
