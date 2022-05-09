/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const HYPIXEL_KEY = process.env.HYPIXEL_KEY
const axios = require("axios");

module.exports = {
    triggers: ['weight', 'w'],
    handler: async function (clientInstance, reply, username, args) {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await getUuidByUsername(givenUsername)

        if (!uuid) {
            reply(`No such username! (given: ${givenUsername})`)
            return
        }

        reply(`${givenUsername}'s weight: ${await getSenitherData(uuid)}`)
    }
}

async function getSenitherData(uuid) {
    let res = await axios(`https://hypixel-api.senither.com/v1/profiles/${uuid}/weight?key=${HYPIXEL_KEY}`)
        .then(res => res.data.data)

    let total = (res?.weight || 0) + (res?.weight_overflow || 0)
    let skills = (res?.skills?.weight || 0) + (res?.skills?.weight_overflow || 0)
    let slayers = (res?.slayers?.weight || 0) + (res?.slayers?.weight_overflow || 0)
    let dungeons = (res?.dungeons?.weight || 0) + (res?.dungeons?.weight_overflow || 0)

    return `${Math.floor(total)}`
        + ` / Skills ${Math.floor(skills)} (${((skills / total) * 100).toFixed(1)}%)`
        + ` / Slayers ${Math.floor(slayers)} (${((slayers / total) * 100).toFixed(1)}%)`
        + ` / Dungeons ${Math.floor(dungeons)} (${((dungeons / total) * 100).toFixed(1)}%)`
}

function getUuidByUsername(username) {
    return axios(`https://api.mojang.com/users/profiles/minecraft/${username}`)
        .then(res => res.data?.id)
}