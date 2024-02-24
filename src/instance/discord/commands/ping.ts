import type { APIEmbed, ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from 'discord.js'
import type DiscordInstance from '../discord-instance'
import type { CommandInterface } from '../common/command-interface'
import { Permission } from '../common/command-interface'
import { ColorScheme, DefaultCommandFooter } from '../common/discord-config'

function createPing(latency: number, websocket: number, lag: number): APIEmbed {
  return {
    color: ColorScheme.DEFAULT,
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
  permission: Permission.ANYONE,
  allowInstance: false,

  handler: async function (clientInstance: DiscordInstance, interaction: ChatInputCommandInteraction) {
    const timestamp = Date.now()

    const defer = await interaction.deferReply({ fetchReply: true })

    const latency = defer.createdTimestamp - interaction.createdTimestamp
    const websocket = interaction.client.ws.ping
    const lag = timestamp - interaction.createdTimestamp

    await interaction.editReply({ embeds: [createPing(latency, websocket, lag)] })
  }
} satisfies CommandInterface