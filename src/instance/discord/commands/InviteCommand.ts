import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'

const COMMAND: DiscordCommandInterface = {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('invite')
      .setDescription('invite player to the guild in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  allowInstance: true,

  permission: Permission.HELPER,
  handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
    await interaction.deferReply()

    // @ts-expect-error "getString" not defined in command interaction for some reason
    const username: string = interaction.options.getString('username')
    const command = `/g invite ${username}`

    // @ts-expect-error "getString" not defined in command interaction for some reason
    const instance: string | null = interaction.options.getString('instance')
    if (instance != null) {
      clientInstance.app.clusterHelper.sendCommandToMinecraft(instance, command)
    } else {
      clientInstance.app.clusterHelper.sendCommandToAllMinecraft(command)
    }

    await interaction.editReply(`Command sent to invite ${username}!`)
  }
} satisfies DiscordCommandInterface

export default COMMAND
