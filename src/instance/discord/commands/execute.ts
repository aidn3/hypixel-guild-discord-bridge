import { SlashCommandBuilder } from 'discord.js'

import { MinecraftSendChatPriority, Permission } from '../../../common/application-event.js'
import type { DiscordBridgeCommandHandler } from '../../../common/commands.js'
import { CommandOrigin, OptionMinecraftInstance } from '../../../common/commands.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('execute')
      .setDescription('Execute command in-game via Minecraft client')
      .addStringOption((option) =>
        option.setName('command').setDescription('command to execute. e.g. "/guild party"').setRequired(true)
      ),
  origin: CommandOrigin.Bridge,
  addMinecraftInstancesToOptions: OptionMinecraftInstance.RequireOne,
  permission: Permission.BridgeAdmin,

  handler: async function (context) {
    await context.interaction.deferReply()

    const command: string = context.interaction.options.getString('command', true)
    const instance = context.minecraftInstance

    await context.application.sendMinecraft([instance], MinecraftSendChatPriority.High, undefined, command)
    await context.interaction.editReply(`Command executed: ${command}`)
  }
} satisfies DiscordBridgeCommandHandler<OptionMinecraftInstance.RequireOne>
