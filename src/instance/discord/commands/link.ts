import assert from 'node:assert'

import { escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { HypixelApiFail, HypixelFailType } from '../../../core/hypixel/hypixel'
import type { HypixelPlayer } from '../../../core/hypixel/hypixel-player'
import { formatInvalidUsername } from '../common/commands-format.js'
import { DefaultCommandFooter } from '../common/discord-config.js'
import type { UpdateContext, UpdateProgress } from '../conditions/common'

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
    const startTime = Date.now()

    const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
    if (mojangProfile === undefined) {
      await interaction.editReply({ embeds: [formatInvalidUsername(username)] })
      return
    }

    let player: HypixelPlayer | undefined
    try {
      player = await context.application.hypixelApi.getPlayer(mojangProfile.id, startTime)
    } catch (error: unknown) {
      if (error instanceof HypixelApiFail && error.type === HypixelFailType.Throttle) {
        context.errorHandler.error('fetching Hypixel player data for /link', error)
        await interaction.editReply({
          embeds: [
            {
              title: 'Please try again in a moment',
              color: Color.Bad,
              description:
                'Too many requests are being made right now, so your information can’t be loaded at the moment.' +
                ' Please wait about 5 minutes and try again.',
              footer: { text: DefaultCommandFooter }
            }
          ]
        })
        return
      }

      throw error
    }
    if (player === undefined) {
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

    const discord = player.socialMedia?.links.DISCORD
    if (discord === undefined || discord !== interaction.user.username) {
      await interaction.editReply({
        embeds: [
          {
            title: 'Failed To Link',
            description:
              `Please update your in-game Hypixel socials for Discord from ` +
              (discord === undefined ? 'None' : `\`${escapeMarkdown(discord)}\``) +
              ` to \`${interaction.user.username}\``,
            color: Color.Bad,
            footer: { text: DefaultCommandFooter }
          }
        ]
      })
      return
    }

    context.application.core.verification.addConfirmedLink(interaction.user.id, mojangProfile.id)

    if (!context.interaction.inGuild()) {
      await interaction.editReply('Successfully linked!')
      return
    }
    assert.ok(interaction.inCachedGuild())

    const progress: UpdateProgress = {
      totalGuilds: 0,
      processedGuilds: 0,
      totalUsers: 0,
      processedUsers: 0,
      processedRoles: 0,
      processedNicknames: 0,
      errors: []
    }
    const updateContext = {
      application: context.application,
      updateReason: `Manual sync via /${context.interaction.commandName} by ${interaction.user.username}`,
      abortSignal: new AbortController().signal,
      startTime: startTime,
      progress: progress
    } satisfies UpdateContext

    const guildMember = await interaction.member.fetch()

    const user = await context.application.core.initializeDiscordUser(
      context.application.discordInstance.profileByUser(guildMember.user, guildMember),
      { guild: guildMember.guild }
    )

    await context.application.discordInstance.conditionsManager.updateMember(updateContext, { guildMember, user })
    await interaction.editReply('Successfully linked and synced!')
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
