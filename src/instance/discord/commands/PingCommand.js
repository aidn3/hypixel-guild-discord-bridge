const {SlashCommandBuilder} = require('@discordjs/builders')
const {MessageEmbed} = require("discord.js")
const DISCORD_CONFIG = require('../../../../config/discord-config.json')

function createPing(latency, websocket, lag) {
    return new MessageEmbed()
        .setColor(DISCORD_CONFIG.commands.color)
        .setTitle('Discord Ping')
        .setDescription(
            `**Latency:** ${latency}ms\n`
            + `**Websocket heartbeat:** ${websocket}ms.\n`
            + `**Server lag:** ${lag}ms`)
        .setTimestamp()
        .setFooter(DISCORD_CONFIG.commands.footer)
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Discord Ping'),
    permission: 0, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        let timestamp = new Date().getTime()

        let defer = await interaction.deferReply({fetchReply: true})

        let latency = defer.createdTimestamp - interaction.createdTimestamp
        let websocket = interaction.client.ws.ping
        let lag = timestamp - interaction.createdTimestamp

        interaction.editReply({embeds: [createPing(latency, websocket, lag)]})
    }
}
