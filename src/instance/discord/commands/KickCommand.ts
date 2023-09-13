import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
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

  handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
    await interaction.deferReply()

    // @ts-expect-error "getString" not defined in command interaction for some reason
    const username: string = interaction.options.getString('username')
    // @ts-expect-error "getString" not defined in command interaction for some reason
    const reason: string = interaction.options.getString('reason')
    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g kick ${username} ${reason}`)

    await interaction.editReply(`Command sent to kick ${username}!`)
  }
} satisfies DiscordCommandInterface
