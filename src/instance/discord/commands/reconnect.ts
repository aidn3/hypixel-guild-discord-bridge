import assert from 'node:assert'

import { SlashCommandBuilder } from 'discord.js'

import { InstanceSignalType, Permission } from '../../../common/application-event.js'
import type { DiscordBridgeCommandHandler } from '../../../common/commands.js'
import { CommandOrigin, OptionMinecraftInstance } from '../../../common/commands.js'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('reconnect').setDescription('Reconnect minecraft clients'),
  origin: CommandOrigin.Bridge,
  addMinecraftInstancesToOptions: OptionMinecraftInstance.RequireOne,
  permission: Permission.Helper,

  handler: async function (context) {
    await context.interaction.deferReply()

    const targetInstance = context.minecraftInstance
    assert.ok(targetInstance)

    await context.application.sendSignal([targetInstance], InstanceSignalType.Restart)
    await context.interaction.editReply('Reconnect signal has been sent!')
  }
} satisfies DiscordBridgeCommandHandler<OptionMinecraftInstance.RequireOne>
