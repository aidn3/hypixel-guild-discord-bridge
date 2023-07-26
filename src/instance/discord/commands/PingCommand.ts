import DiscordInstance from "../DiscordInstance"
import {CommandInteraction, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import {ColorScheme, DefaultCommandFooter} from "../common/DiscordConfig";


function createPing(latency: number, websocket: number, lag: number) {
    return {
        color: ColorScheme.DEFAULT,
        title: 'Discord Ping',
        description: `**Latency:** ${latency}ms\n`
            + `**Websocket heartbeat:** ${websocket}ms.\n`
            + `**Server lag:** ${lag}ms`,
        footer: {
            text: DefaultCommandFooter
        }
    }
}

const COMMAND: DiscordCommandInterface = {
    getCommandBuilder: () => new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Discord Ping'),
    permission: Permission.ANYONE,
    allowInstance: false,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        let timestamp = new Date().getTime()

        let defer = await interaction.deferReply({fetchReply: true})

        let latency = defer.createdTimestamp - interaction.createdTimestamp
        let websocket = interaction.client.ws.ping
        let lag = timestamp - interaction.createdTimestamp

        await interaction.editReply({embeds: [createPing(latency, websocket, lag)]})
    }
}

export default COMMAND
