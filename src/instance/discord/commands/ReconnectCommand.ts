import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { DiscordCommandInterface, Permission } from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName("reconnect").setDescription("reconnect minecraft clients"),
  allowInstance: true,
  permission: Permission.HELPER,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetInstance: string | null = interaction.options.getString("instance")
    clientInstance.app.emit("reconnectSignal", {
      localEvent: true,
      targetInstanceName: targetInstance ?? undefined
    })
    await interaction.editReply("Reconnect signal has been sent!")
  }
} satisfies DiscordCommandInterface
