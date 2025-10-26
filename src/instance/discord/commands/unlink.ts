import { SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('unlink')
      .setDescription('unlink your Discord account from your Minecraft account'),

  handler: async function (context) {
    const interaction = context.interaction
    await interaction.deferReply()

    const count = context.application.core.verification.invalidate({ discordId: interaction.user.id })
    await (count > 0 ? interaction.editReply('Successfully unlinked!') : interaction.editReply('Nothing to unlink!'))
  }
} satisfies DiscordCommandHandler
