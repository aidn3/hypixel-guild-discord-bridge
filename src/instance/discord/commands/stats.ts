import type { APIEmbed } from 'discord.js'
import { SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

function createStatsEmbed(
  username: string,
  stats: {
    level?: number
    kills?: number
    wins?: number
    kdr?: number
    wlr?: number
    coins?: number
  },
  gameMode: string
): APIEmbed {
  const fields = []

  if (stats.level !== undefined) fields.push({ name: 'Level', value: `${stats.level}✫`, inline: true })
  if (stats.kills !== undefined) fields.push({ name: 'Kills', value: stats.kills.toLocaleString(), inline: true })
  if (stats.wins !== undefined) fields.push({ name: 'Wins', value: stats.wins.toLocaleString(), inline: true })
  if (stats.kdr !== undefined) fields.push({ name: 'K/D Ratio', value: stats.kdr.toFixed(2), inline: true })
  if (stats.wlr !== undefined) fields.push({ name: 'W/L Ratio', value: stats.wlr.toFixed(2), inline: true })
  if (stats.coins !== undefined) fields.push({ name: 'Coins', value: stats.coins.toLocaleString(), inline: true })

  return {
    color: Color.Default,
    title: `${gameMode} Stats for ${username}`,
    fields,
    footer: {
      text: DefaultCommandFooter
    }
  }
}

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('stats')
      .setDescription("View a player's game stats")
      .addStringOption(
        new SlashCommandStringOption()
          .setName('game')
          .setDescription('Game mode')
          .setRequired(true)
          .addChoices(
            { name: 'Bedwars', value: 'bedwars' },
            { name: 'Skywars', value: 'skywars' },
            { name: 'Duels', value: 'duels' },
            { name: 'Murder Mystery', value: 'murdermystery' },
            { name: 'TNT Games', value: 'tntgames' }
          )
      )
      .addStringOption(
        new SlashCommandStringOption().setName('username').setDescription('Minecraft username').setRequired(true)
      ),

  handler: async function (context) {
    const game = context.interaction.options.getString('game', true)
    const username = context.interaction.options.getString('username', true)

    await context.interaction.deferReply()

    try {
      // Get UUID from Mojang API
      const uuid = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
      if (!uuid) {
        await context.interaction.editReply(`Could not find player: \`${username}\``)
        return
      }

      // Get player data from Hypixel API
      const player = await context.application.hypixelApi.getPlayer(uuid.id, {}).catch(() => undefined)
      if (!player) {
        await context.interaction.editReply(`\`${username}\` has never played on Hypixel.`)
        return
      }

      let stats: { level?: number; kills?: number; wins?: number; kdr?: number; wlr?: number; coins?: number } = {}
      let gameTitle = ''

      switch (game) {
        case 'bedwars': {
          const bw = player.stats?.bedwars
          if (!bw) {
            await context.interaction.editReply(`\`${username}\` has never played Bedwars.`)
            return
          }
          stats = {
            level: bw.level,
            kills: bw.kills,
            wins: bw.wins,
            kdr: bw.KDRatio,
            wlr: bw.WLRatio
          }
          gameTitle = 'Bedwars'
          break
        }
        case 'skywars': {
          const sw = player.stats?.skywars
          if (!sw) {
            await context.interaction.editReply(`\`${username}\` has never played Skywars.`)
            return
          }
          stats = {
            level: sw.level,
            kills: sw.kills,
            wins: sw.wins,
            kdr: sw.KDRatio,
            wlr: sw.WLRatio,
            coins: sw.coins
          }
          gameTitle = 'Skywars'
          break
        }
        case 'duels': {
          const d = player.stats?.duels
          if (!d) {
            await context.interaction.editReply(`\`${username}\` has never played Duels.`)
            return
          }
          stats = {
            kills: d.kills,
            wins: d.wins,
            kdr: d.KDRatio,
            wlr: d.WLRatio
          }
          gameTitle = 'Duels'
          break
        }
        case 'murdermystery': {
          const mm = player.stats?.murdermystery
          if (!mm) {
            await context.interaction.editReply(`\`${username}\` has never played Murder Mystery.`)
            return
          }
          stats = {
            kills: mm.kills,
            wins: mm.wins
          }
          gameTitle = 'Murder Mystery'
          break
        }
        case 'tntgames': {
          const tnt = player.stats?.tntgames
          if (!tnt) {
            await context.interaction.editReply(`\`${username}\` has never played TNT Games.`)
            return
          }
          stats = {
            wins: tnt.wins,
            coins: tnt.coins
          }
          gameTitle = 'TNT Games'
          break
        }
        default: {
          await context.interaction.editReply(`Unknown game mode: \`${game}\``)
          return
        }
      }

      await context.interaction.editReply({ embeds: [createStatsEmbed(username, stats, gameTitle)] })
    } catch (error) {
      context.logger.error('Error fetching stats:', error)
      await context.interaction.editReply(`An error occurred while fetching stats for \`${username}\`.`)
    }
  }
} satisfies DiscordCommandHandler
