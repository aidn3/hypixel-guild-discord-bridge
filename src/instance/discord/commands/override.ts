import { SlashCommandBuilder } from 'discord.js'

import { MinecraftSendChatPriority, Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { CommandScope, OptionToAddMinecraftInstances } from '../../../common/commands.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('override')
      .setDescription('execute command to all clients in-game')
      .addStringOption((option) =>
        option.setName('command').setDescription('command to execute. e.g. "/guild party"').setRequired(true)
      ),
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Required,
  permission: Permission.Admin,
  scope: CommandScope.Privileged,

  handler: async function (context) {
    await context.interaction.deferReply()

    const command: string = context.interaction.options.getString('command', true)
    const instance: string = context.interaction.options.getString('instance', true)

    context.application.emit('minecraftSend', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: [instance],
      priority: MinecraftSendChatPriority.High,
      command: command
    })
    await context.interaction.editReply(`Command executed: ${command}`)
  }
} satisfies DiscordCommandHandler
