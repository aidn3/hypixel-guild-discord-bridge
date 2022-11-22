/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const axios = require("axios")

module.exports = {
    triggers: ['weight', 'w'],
    handler: async function (clientInstance, username, args) {

        let givenUsername = args[0] !== undefined ? args[0] : username
        return `${givenUsername}'s weight: ${await getSenitherData(givenUsername)}`
    }
}

async function getSenitherData(username) {
    let profiles = await axios(`https://sky.shiiyu.moe/api/v2/profile/${username}`)
        .then(res => res.data["profiles"])

    let weight = Object.values(profiles)
        .find(profile => profile["current"])["data"]["weight"]["senither"]

    let total = (weight.overall || 0)
    let skills = (weight.skill.total || 0)
    let slayers = (weight.slayer.total || 0)
    let dungeons = (weight.dungeon.total || 0)

    return `${Math.floor(total)}`
        + ` / Skills ${Math.floor(skills)} (${((skills / total) * 100).toFixed(1)}%)`
        + ` / Slayers ${Math.floor(slayers)} (${((slayers / total) * 100).toFixed(1)}%)`
        + ` / Dungeons ${Math.floor(dungeons)} (${((dungeons / total) * 100).toFixed(1)}%)`
}