import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('restart').setDescription('restart minecraft clients'),
  allowInstance: true,
  permission: Permission.HELPER,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const targetInstance: string | null = interaction.options.getString('instance')
    clientInstance.app.emit('restartSignal', {
      localEvent: true,
      // null set again to ensure "undefined" never come back in case discord library changes it again
      targetInstanceName: targetInstance ?? null
    })
    await interaction.editReply('Restart signal has been sent!')
  }
} satisfies DiscordCommandInterface
