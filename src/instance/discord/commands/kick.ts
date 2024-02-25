import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'
import type DiscordInstance from '../discord-instance'

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
} satisfies CommandInterface
