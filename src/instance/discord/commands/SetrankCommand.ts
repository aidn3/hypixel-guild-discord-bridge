// noinspection SpellCheckingInspection

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('setrank')
      .setDescription('setrank guild member in-game')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('rank').setDescription('rank to change to').setRequired(true)
      ) as SlashCommandBuilder,
  permission: Permission.HELPER,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const username: string = interaction.options.getString('username', true)
    const rank: string = interaction.options.getString('rank', true)

    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g setrank ${username} ${rank}`)
    await interaction.editReply(`Command sent to setrank ${username} to ${rank}!`)
  }
} satisfies DiscordCommandInterface
