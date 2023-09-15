import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('accept')
      .setDescription('accept a player to the guild if they have a join request in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  allowInstance: true,
  permission: Permission.HELPER,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString('username', true)
    const command = `/g accept ${username}`

    const instance: string | null = interaction.options.getString('instance')
    if (instance != null) {
      clientInstance.app.clusterHelper.sendCommandToMinecraft(instance, command)
    } else {
      clientInstance.app.clusterHelper.sendCommandToAllMinecraft(command)
    }

    await interaction.editReply(`Command sent to accept ${username}!`)
  }
} satisfies DiscordCommandInterface
