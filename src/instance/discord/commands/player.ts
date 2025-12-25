import type { APIEmbed } from 'discord.js'
import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

function createPlayerEmbed(
  username: string,
  uuid: string,
  rank: string,
  level: number,
  firstLogin: Date,
  lastLogin: Date,
  karma: number
): APIEmbed {
  return {
    color: Color.Default,
    title: `👤 Player: ${username}`,
    thumbnail: {
      url: `https://mc-heads.net/avatar/${uuid}/100`
    },
    fields: [
      { name: 'Rank', value: rank, inline: true },
      { name: 'Network Level', value: level.toFixed(0), inline: true },
      { name: 'Karma', value: karma.toLocaleString(), inline: true },
      { name: 'First Login', value: `<t:${Math.floor(firstLogin.getTime() / 1000)}:R>`, inline: true },
      { name: 'Last Login', value: `<t:${Math.floor(lastLogin.getTime() / 1000)}:R>`, inline: true }
    ],
    footer: {
      text: DefaultCommandFooter
    }
  }
}

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('player')
      .setDescription("View a player's Hypixel profile")
      .addStringOption(
        new SlashCommandStringOption().setName('username').setDescription('Minecraft username').setRequired(true)
      ),

  handler: async function (context) {
    const username = context.interaction.options.getString('username', true)

    await context.interaction.deferReply()

    try {
      // Get UUID from Mojang API
      const profile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
      if (!profile) {
        await context.interaction.editReply(`Could not find player: \`${username}\``)
        return
      }

      // Get player data from Hypixel API
      const player = await context.application.hypixelApi.getPlayer(profile.id, {}).catch(() => undefined)
      if (!player) {
        await context.interaction.editReply(`\`${username}\` has never played on Hypixel.`)
        return
      }

      const rank = player.rank
      const level = player.level
      const firstLogin = player.firstLoginTimestamp ? new Date(player.firstLoginTimestamp) : new Date()
      const lastLogin = player.lastLoginTimestamp ? new Date(player.lastLoginTimestamp) : new Date()
      const karma = player.karma

      await context.interaction.editReply({
        embeds: [createPlayerEmbed(player.nickname, profile.id, rank, level, firstLogin, lastLogin, karma)]
      })
    } catch (error) {
      context.logger.error('Error fetching player:', error)
      await context.interaction.editReply(`An error occurred while fetching player for \`${username}\`.`)
    }
  }
} satisfies DiscordCommandHandler
