const {SlashCommandBuilder} = require('@discordjs/builders')
const {MessageEmbed} = require("discord.js")
const mojang = require("mojang")

const HYPIXEL_KEY = process.env.HYPIXEL_KEY
const hypixel = new (require("hypixel-api-reborn").Client)(HYPIXEL_KEY)

const DISCORD_CONFIG = require('../../../config/discord-config.json')
const {escapeDiscord} = require("../../common/DiscordMessageUtil");

function createEmbed(list) {
    return new MessageEmbed()
        .setColor(DISCORD_CONFIG.commands.color)
        .setTitle(`Guild Online Players (${list.length}):`)
        .setDescription(list.join("\n"))
        .setTimestamp()
        .setFooter(DISCORD_CONFIG.commands.footer)
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List Online Players'),
    permission: 0, // 0 = anyone, 1 = staff, 2 = owner/admin

    async execute(clientInstance, interaction) {
        await interaction.deferReply()

        let list = await listMembers(clientInstance.bridge.minecraftInstances)
        interaction.editReply({embeds: [createEmbed(list)]})
    }
}

const listMembers = async function (minecraftInstances) {
    let onlineProfiles = await getOnlineMembers(minecraftInstances)
        .then(unique)
        .then(lookupProfiles)
        .then(profiles => profiles.sort((a, b) => a.name.localeCompare(b.name)))

    let statuses = await Promise.all(onlineProfiles.map(profile => hypixel.getStatus(profile.id)))

    let list = []
    for (let i = 0; i < onlineProfiles.length; i++) {
        list.push(formatLocation(onlineProfiles[i].name, statuses[i]))
    }
    return list
}

// Mojang only allow up to 10 usernames per lookup
async function lookupProfiles(usernames) {
    let mojangRequests = []

    // https://stackoverflow.com/a/8495740
    let i, j, arr, chunk = 10
    for (i = 0, j = usernames.length; i < j; i += chunk) {
        arr = usernames.slice(i, i + chunk)
        mojangRequests.push(mojang.lookupProfiles(arr))
    }

    let p = await Promise.all(mojangRequests)
    return p.flatMap(arr => arr)
}

function formatLocation(username, session) {
    let message = `- **${escapeDiscord(username)}** `

    if (!session.online) return message + ` is *__offline?__*`

    message += "*" // START discord markdown. italic
    message += `playing __${escapeDiscord(session.game.name)}__`
    if (session.mode) message += ` in ${escapeDiscord(session.mode.toLowerCase())}`
    message += "*" // END discord markdown. italic

    return message
}

async function getOnlineMembers(minecraftInstances) {
    let resolvedNames = []
    const regexOnline = /(\w{3,16}) \u25CF/g

    const chatListener = function (event) {
        let eventMessage = event.toString().trim()
        if (!eventMessage) return

        let match = regexOnline.exec(eventMessage)
        while (match != null) {
            resolvedNames.push(match[1])
            match = regexOnline.exec(eventMessage)
        }
    }

    minecraftInstances.forEach(inst => inst.client.on('message', chatListener))
    minecraftInstances.forEach(inst => inst.send("/guild list"))
    await new Promise(r => setTimeout(r, 3000))
    minecraftInstances.forEach(inst => inst.client.removeListener('message', chatListener))

    return resolvedNames
}

function unique(list) {
    return list.filter(function (item, pos) {
        return list.indexOf(item) === pos
    })
}