import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('kick player out of the guild in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('reason').setDescription('reason to kick the player').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.OFFICER,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString('username', true)
    const reason: string = interaction.options.getString('reason', true)
    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g kick ${username} ${reason}`)

    await interaction.editReply(`Command sent to kick ${username}!`)
  }
} satisfies DiscordCommandInterface
