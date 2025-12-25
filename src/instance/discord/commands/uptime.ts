import type { APIEmbed } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

function createUptimeEmbed(uptimeSeconds: number, startTimestamp: number): APIEmbed {
  const days = Math.floor(uptimeSeconds / 86_400)
  const hours = Math.floor((uptimeSeconds % 86_400) / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  const seconds = Math.floor(uptimeSeconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)

  return {
    color: Color.Good,
    title: '🕐 Bot Uptime',
    description: `**Uptime:** ${parts.join(' ')}\n**Online since:** <t:${startTimestamp}:R>`,
    footer: {
      text: DefaultCommandFooter
    }
  }
}

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('uptime').setDescription('Shows how long the bot has been online'),

  handler: async function (context) {
    const uptime = context.interaction.client.uptime
    const uptimeSeconds = uptime / 1000
    const startTimestamp = Math.floor((Date.now() - uptime) / 1000)

    await context.interaction.reply({ embeds: [createUptimeEmbed(uptimeSeconds, startTimestamp)] })
  }
} satisfies DiscordCommandHandler
