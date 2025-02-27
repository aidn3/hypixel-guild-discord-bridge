import type { APIEmbed } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { Permission } from '../../../common/commands.js'
import { DefaultCommandFooter } from '../common/discord-config.js'

function createPing(latency: number, websocket: number, lag: number): APIEmbed {
  return {
    color: Color.Default,
    title: 'Discord Ping',
    description:
      `**Latency:** ${latency}ms\n` + `**Websocket heartbeat:** ${websocket}ms.\n` + `**Server lag:** ${lag}ms`,
    footer: {
      text: DefaultCommandFooter
    }
  }
}

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('ping').setDescription('Discord Ping'),
  permission: Permission.Anyone,
  allowInstance: false,

  handler: async function (context) {
    const timestamp = Date.now()

    await context.interaction.deferReply()
    const defer = await context.interaction.fetchReply()

    const latency = defer.createdTimestamp - context.interaction.createdTimestamp
    const websocket = context.interaction.client.ws.ping
    const lag = timestamp - context.interaction.createdTimestamp

    await context.interaction.editReply({ embeds: [createPing(latency, websocket, lag)] })
  }
} satisfies DiscordCommandHandler
