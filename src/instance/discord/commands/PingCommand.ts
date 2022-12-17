import DiscordInstance from "../DiscordInstance"
import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"

const DISCORD_CONFIG = require('../../../../config/discord-config.json')

function createPing(latency: number, websocket: number, lag: number) {
    return {
        color: DISCORD_CONFIG.commands.color,
        title: 'Discord Ping',
        description: `**Latency:** ${latency}ms\n`
            + `**Websocket heartbeat:** ${websocket}ms.\n`
            + `**Server lag:** ${lag}ms`,
        footer: {
            text: DISCORD_CONFIG.commands.footer
        }
    }
}

export default <DiscordCommandInterface>{
    commandBuilder: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Discord Ping'),
    permission: Permission.ANYONE,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        let timestamp = new Date().getTime()

        let defer = await interaction.deferReply({fetchReply: true})

        let latency = defer.createdTimestamp - interaction.createdTimestamp
        let websocket = interaction.client.ws.ping
        let lag = timestamp - interaction.createdTimestamp

        await interaction.editReply({embeds: [createPing(latency, websocket, lag)]})
    }
}
