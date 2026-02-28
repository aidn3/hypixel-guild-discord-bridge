import { SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('link')
      .setDescription('Link your Discord account with your Minecraft account')
      .addStringOption((option) =>
        option.setName('username').setDescription('Username of the player').setRequired(true).setAutocomplete(true)
      ),

  handler: async function (context) {
    const interaction = context.interaction
    await interaction.deferReply()

    const manager = context.application.discordInstance.linkButtons
    const username: string = context.interaction.options.getString('username', true)
    const startTime = Date.now()

    const linkResult = await manager.tryLinking(interaction, startTime, username)
    if (!linkResult) return

    const syncResult = await manager.forceSync(interaction, startTime)
    if (!syncResult) return
  },
  autoComplete: async function (context) {
    const option = context.interaction.options.getFocused(true)
    if (option.name === 'username') {
      const response = context.application.core
        .completeUsername(option.value, 25)
        .map((choice) => ({ name: choice, value: choice }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler
