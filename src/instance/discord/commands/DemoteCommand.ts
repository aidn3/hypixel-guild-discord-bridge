import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import type { DiscordCommandInterface } from '../common/DiscordCommandInterface'
import { Permission } from '../common/DiscordCommandInterface'
import type DiscordInstance from '../DiscordInstance'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('demote')
      .setDescription('demote guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString('username', true)
    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g demote ${username}`)

    await interaction.editReply(`Command sent to demote ${username}!`)
  }
} satisfies DiscordCommandInterface
