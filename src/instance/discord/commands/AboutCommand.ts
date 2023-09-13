// noinspection JSUnusedGlobalSymbols

import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { DiscordCommandInterface, Permission } from '../common/DiscordCommandInterface'
import DiscordInstance from '../DiscordInstance'

const COMMAND: DiscordCommandInterface = {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('about').setDescription('Display basic info about the client.'),
  permission: Permission.ANYONE,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
    await interaction.deferReply()

    await interaction.editReply(
      "This is a bridge that connects guild's discord server with it's guild chat while offering many features.\n" +
        'That way, you can chat with your friends within in-game from the discord.\n' +
        'The features of the bot can be viewed with /help.'
    )
  }
} satisfies DiscordCommandInterface

export default COMMAND
