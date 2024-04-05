import { SlashCommandBuilder } from 'discord.js'

import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('about').setDescription('Display basic info about the client.'),
  permission: Permission.ANYONE,
  allowInstance: false,

  handler: async function (context) {
    await context.interaction.deferReply()

    await context.interaction.editReply(
      "This is a bridge that connects guild's discord server with it's guild chat while offering many features.\n" +
        'That way, you can chat with your friends within in-game from the discord.\n' +
        'The features of the bot can be viewed with /help.'
    )
  }
} satisfies CommandInterface
