/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

const HYPIXEL_KEY = process.env.HYPIXEL_KEY
const axios = require("axios")
const moment = require("moment")

module.exports = {
    triggers: ['guild', 'guildof', 'g'],
    handler: async function (clientInstance, reply, username, args) {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await getUuidByUsername(givenUsername)

        if (!uuid) {
            reply(`No such username! (given: ${givenUsername})`)
            return
        }

        reply(`${givenUsername}'s guild: ${await fetchGuildInfo(uuid)}`)
    }
}

async function fetchGuildInfo(uuid) {
    let res = await axios.get(`https://api.hypixel.net/guild?key=${HYPIXEL_KEY}&player=${uuid}`)
        .then(res => res.data)

    if (!res.success) throw  new Error(res.message)
    if (!res.guild) return "No Guild."

    let member = res.guild.members.find(m => m.uuid === uuid)
    return `Name: ${res.guild.name}`
        + ` / Level: ${getGuildLevel(res.guild.exp)}`
        + ` / Created: ${moment(res.guild.created).format('YYYY-MM-DD')}`
        + ` / Rank: ${member.rank}`
        + ` / Joined: ${moment(member.joined).format('YYYY-MM-DD')}`
}

// https://github.com/Plancke/hypixel-php/blob/master/src/responses/guild/GuildLevelUtil.php
function getGuildLevel(exp) {
    const EXP_NEEDED = [
        100000, 150000, 250000, 500000, 750000,
        1000000, 1250000, 1500000, 2000000, 2500000,
        2500000, 2500000, 2500000, 2500000, 3000000
    ]

    let level = 0
    let need
    for (let i = 0; ; i++) {
        need = i >= EXP_NEEDED.length ? EXP_NEEDED[EXP_NEEDED.length - 1] : EXP_NEEDED[i]
        exp -= need
        if (exp < 0) {
            return level

        } else {
            level++
        }
    }
}

function getUuidByUsername(username) {
    return axios(`https://api.mojang.com/users/profiles/minecraft/${username}`)
        .then(res => res.data?.id)
}