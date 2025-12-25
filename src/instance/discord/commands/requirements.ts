import { escapeMarkdown, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import { formatInvalidUsername } from '../common/commands-format.js'
import { checkGuildRequirements, createGuildRequirementsEmbed } from '../common/guild-requirements.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('requirements')
      .setDescription('Check if a player meets guild requirements')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('username')
          .setDescription('Minecraft username')
          .setRequired(false)
          .setAutocomplete(true)
      ),

  handler: async function (context) {
    await context.interaction.deferReply()

    const config = context.application.getGuildRequirementsConfig()
    if (!config?.enabled) {
      await context.interaction.editReply('Guild requirements are not configured.')
      return
    }

    const linkedProfile = context.user.mojangProfile()
    const username = context.interaction.options.getString('username') ?? linkedProfile?.name
    if (!username) {
      await context.interaction.editReply('Please provide a username or link your account first.')
      return
    }

    const profile =
      linkedProfile && linkedProfile.name.toLowerCase() === username.toLowerCase()
        ? linkedProfile
        : await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
    if (!profile) {
      await context.interaction.editReply({ embeds: [formatInvalidUsername(username)] })
      return
    }

    const requirements = config.requirements
    const result = await checkGuildRequirements(context.application, profile.id, requirements, profile.name)
    if (!result) {
      await context.interaction.editReply(`\`${escapeMarkdown(username)}\` has never played on Hypixel.`)
      return
    }

    await context.interaction.editReply({
      embeds: [
        createGuildRequirementsEmbed({
          ...result,
          requirements
        })
      ]
    })
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
