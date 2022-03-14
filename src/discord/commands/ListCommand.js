const {SlashCommandBuilder} = require('@discordjs/builders')
const {MessageEmbed} = require("discord.js")
const axios = require('axios')

const DISCORD_CONFIG = require('../../../config/discord-config.json')
const HYPIXEL_KEY = process.env.HYPIXEL_KEY

function createEmbed(list, count) {
    return new MessageEmbed()
        .setColor(DISCORD_CONFIG.commands.color)
        .setTitle(`Guild Online Players (${count}):`)
        .setDescription(list)
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
        interaction.editReply({embeds: [createEmbed(list, list.trim().split("\n").length)]})
    }
}

const listMembers = async function (minecraftInstances) {
    let onlineMembers = await getOnlineMembers(minecraftInstances)
        .then(onlinePlayers => onlinePlayers.filter(function (item, pos) {
            return onlinePlayers.indexOf(item) === pos
        }))

    let status = await getUuids(onlineMembers).then(uuids => getHypixelStatus(uuids))
    return createList(onlineMembers, status)
}

function createList(usernames, statuses) {
    let list = ""
    for (let i = 0; i < usernames.length; i++) {
        let username = usernames[i]
        let status = statuses[i]
        list += `- **${username}**`

        if (status.session) {
            list += "_" // START discord markdown. italic

            if (status.session.online) {
                // capitalize first letter of gameType, lowercase everything else
                // e.g. SKYBLOCK -> Skyblock
                let gameType = status.session.gameType.charAt(0).toUpperCase()
                    + status.session.gameType.slice(1).toLowerCase()
                list += ` playing __${gameType}__`

                if (status.session.mode) {
                    list += " in " + status.session.mode.toLowerCase()
                }

            } else {
                list += " is __offline?__ somehow"
            }

            list += "_" // END discord markdown. italic
        }

        list += "\n"
    }
    return list
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

async function getUuids(usernames) {
    let mojangRequests = []
    // https://stackoverflow.com/a/8495740
    let i, j, arr, chunk = 10
    for (i = 0, j = usernames.length; i < j; i += chunk) {
        arr = usernames.slice(i, i + chunk)

        let json = axios.post('https://api.mojang.com/profiles/minecraft', arr)
            .then(res => res.data)
        mojangRequests.push(json)
    }


    let p = await Promise.all(mojangRequests)
    return p
        .flatMap(arr => arr)
        .map(member => member.id)
}

async function getHypixelStatus(uuids) {
    let p = uuids.map(u =>
        axios.get(`https://api.hypixel.net/status?key=${HYPIXEL_KEY}&uuid=${u}`)
            .then(res => res.data))


    let arr = await Promise.all(p)
    return arr
        .flatMap(arr => arr)
}