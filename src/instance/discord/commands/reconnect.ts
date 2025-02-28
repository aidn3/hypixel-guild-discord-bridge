import { SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances, Permission } from '../../../common/commands.js'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('reconnect').setDescription('reconnect minecraft clients'),
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Optional,
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const targetInstance: string | null = context.interaction.options.getString('instance')
    context.application.emit('reconnectSignal', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: targetInstance ?? undefined
    })
    await context.interaction.editReply('Reconnect signal has been sent!')
  }
} satisfies DiscordCommandHandler
