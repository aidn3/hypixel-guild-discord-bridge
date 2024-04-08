import { APIEmbed, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import DiscordInstance from "../DiscordInstance"
import { DiscordCommandInterface, Permission } from "../common/DiscordCommandInterface"
import { ColorScheme, DefaultCommandFooter } from "../common/DiscordConfig"

function createPing(latency: number, websocket: number, lag: number): APIEmbed {
  return {
    color: ColorScheme.DEFAULT,
    title: "Discord Ping",
    description:
      `**Latency:** ${latency}ms\n` + `**Websocket heartbeat:** ${websocket}ms.\n` + `**Server lag:** ${lag}ms`,
    footer: {
      text: DefaultCommandFooter
    }
  }
}

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName("ping").setDescription("Discord Ping"),
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
} satisfies DiscordCommandInterface
