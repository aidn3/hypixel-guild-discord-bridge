import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { DiscordCommandInterface, Permission } from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName("unmute")
      .setDescription("unmute guild member in-game")
      .addStringOption((option) =>
        option.setName("username").setDescription("Username of the player").setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString("username", true)
    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g unmute ${username}`)
    clientInstance.app.punishedUsers.unmute(username)

    await interaction.editReply(`Command sent to unmute ${username}!`)
  }
} satisfies DiscordCommandInterface
