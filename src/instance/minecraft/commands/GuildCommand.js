/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

const HYPIXEL_KEY = process.env.HYPIXEL_KEY
const moment = require("moment")
const hypixel = new (require("hypixel-api-reborn").Client)(HYPIXEL_KEY)
const mojang = require("mojang")

module.exports = {
    triggers: ['guild', 'guildof', 'g'],
    handler: async function (clientInstance, username, args) {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await mojang.lookupProfileAt(givenUsername)
            .then(p => p.id)

        if (!uuid) {
            return `No such username! (given: ${givenUsername})`
        }

        return `${givenUsername}'s guild: ${await fetchGuildInfo(uuid)}`
    }
}

async function fetchGuildInfo(uuid) {
    let guild = await hypixel.getGuild("player", uuid, null)

    if (!guild) return "No Guild."

    let member = guild.members.find(m => m.uuid === uuid)
    return `Name: ${guild.name}`
        + ` / Level: ${guild.level}`
        + ` / Created: ${moment(guild.createdAtTimestamp).format('YYYY-MM-DD')}`
        + ` / Members: ${guild.members.length}/125`
        + ` / Rank: ${member.rank}`
        + ` / Joined: ${moment(member.joinedAtTimestamp).format('YYYY-MM-DD')}`
}
