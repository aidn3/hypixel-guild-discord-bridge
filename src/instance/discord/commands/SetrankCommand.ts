// noinspection SpellCheckingInspection

import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
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

  handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
    await interaction.deferReply()

    // @ts-expect-error "getString" not defined in command interaction for some reason
    const username: string = interaction.options.getString('username')
    // @ts-expect-error "getString" not defined in command interaction for some reason
    const rank: string = interaction.options.getString('rank')

    clientInstance.app.clusterHelper.sendCommandToAllMinecraft(`/g setrank ${username} ${rank}`)
    await interaction.editReply(`Command sent to setrank ${username} to ${rank}!`)
  }
} satisfies DiscordCommandInterface
