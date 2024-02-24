// noinspection JSUnusedGlobalSymbols

import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import type { DiscordCommandInterface } from '../common/DiscordCommandInterface'
import { Permission } from '../common/DiscordCommandInterface'
import type DiscordInstance from '../DiscordInstance'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('about').setDescription('Display basic info about the client.'),
  permission: Permission.ANYONE,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    await interaction.editReply(
      "This is a bridge that connects guild's discord server with it's guild chat while offering many features.\n" +
        'That way, you can chat with your friends within in-game from the discord.\n' +
        'The features of the bot can be viewed with /help.'
    )
  }
} satisfies DiscordCommandInterface
