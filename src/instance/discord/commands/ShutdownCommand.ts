import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('shutdown').setDescription('Send signal to shutdown the bridge'),
  allowInstance: false,
  permission: Permission.ADMIN,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    clientInstance.app.emit('shutdownSignal', {
      localEvent: true,
      // undefined is used to set the command globally
      targetInstanceName: undefined
    })

    await interaction.editReply(
      'Shutdown signal has been sent.\n' +
        'It will take some time for the bridge to shut down.\n' +
        'Bridge will auto restart if a service monitor is used.'
    )
  }
} satisfies DiscordCommandInterface
