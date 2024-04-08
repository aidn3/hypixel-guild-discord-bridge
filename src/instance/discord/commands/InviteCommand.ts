import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { DiscordCommandInterface, Permission } from "../common/DiscordCommandInterface"
import DiscordInstance from "../DiscordInstance"

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName("invite")
      .setDescription("invite player to the guild in-game")
      .addStringOption((option) =>
        option.setName("username").setDescription("Username of the player").setRequired(true)
      ) as SlashCommandBuilder,
  allowInstance: true,

  permission: Permission.HELPER,
  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString("username", true)
    const command = `/g invite ${username}`

    const instance: string | null = interaction.options.getString("instance")
    if (instance == undefined) {
      clientInstance.app.clusterHelper.sendCommandToAllMinecraft(command)
    } else {
      clientInstance.app.clusterHelper.sendCommandToMinecraft(instance, command)
    }

    await interaction.editReply(`Command sent to invite ${username}!`)
  }
} satisfies DiscordCommandInterface
