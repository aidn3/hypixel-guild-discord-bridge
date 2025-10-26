import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'
import { Errors } from 'hypixel-api-reborn'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { formatInvalidUsername } from '../common/commands-format.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

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

    const username: string = context.interaction.options.getString('username', true)

    const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
    if (mojangProfile === undefined) {
      await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
      return
    }

    try {
      const player = await context.application.hypixelApi.getPlayer(mojangProfile.id)
      if (player.isRaw()) throw new Error("Something wen't wrong while fetching data")

      const discord = player.socialMedia.discord
      if (discord === null || discord !== interaction.user.username) {
        await interaction.editReply({
          embeds: [
            {
              title: 'Failed To Link',
              description:
                `Please update your in-game Hypixel socials for Discord from ` +
                (discord === null ? 'None' : `\`${escapeMarkdown(discord)}\``) +
                ` to \`${interaction.user.username}\``,
              color: Color.Bad,
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
        return
      }

      context.application.core.verification.addConfirmedLink(interaction.user.id, mojangProfile.id)
      await interaction.editReply('Successfully linked!')
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message === Errors.MALFORMED_UUID || error.message === Errors.PLAYER_HAS_NEVER_LOGGED)
      ) {
        await interaction.editReply({
          embeds: [
            {
              title: 'Player never played on Hypixel before',
              color: Color.Bad,
              description: `Username \`${escapeMarkdown(username)}\` never played on Hypixel before?`,
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
        return
      }

      throw error
    }
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
