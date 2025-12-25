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
    if (count > 0) {
      try {
        await context.application.discordInstance.verificationRoleManager.updateUser(interaction.user.id, {
          guild: interaction.guild ?? undefined
        })
      } catch (error: unknown) {
        context.logger.error('Failed to sync verification roles after unlinking', error)
      }
    }
    await (count > 0 ? interaction.editReply('Successfully unlinked!') : interaction.editReply('Nothing to unlink!'))
  }
} satisfies DiscordCommandHandler
