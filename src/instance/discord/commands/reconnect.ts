import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface.js'
import { Permission } from '../common/command-interface.js'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('reconnect').setDescription('reconnect minecraft clients'),
  allowInstance: true,
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const targetInstance: string | null = context.interaction.options.getString('instance')
    context.application.emit('reconnectSignal', {
      localEvent: true,
      targetInstanceName: targetInstance ?? undefined
    })
    await context.interaction.editReply('Reconnect signal has been sent!')
  }
} satisfies CommandInterface
