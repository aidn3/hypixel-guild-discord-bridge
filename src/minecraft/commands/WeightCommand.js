/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const HYPIXEL_KEY = process.env.HYPIXEL_KEY
const fetch = require("axios");

module.exports = {
    triggers: ['weight', 'w'],
    handler: async function (clientInstance, reply, username, args) {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await getUuidByUsername(givenUsername)

        if (!uuid) {
            reply(`No such username! (given: ${givenUsername})`)
            return
        }

        let senither = await getSenitherData(uuid)
        let weight = senither?.weight
        if (!weight) {
            reply(`${username} doesn't play Skyblock?`)
            return
        }

        reply(`${givenUsername}'s weight: ${Math.floor(weight)}`)
    }
}

function getSenitherData(uuid) {
    return fetch(`https://hypixel-api.senither.com/v1/profiles/${uuid}/weight?key=${HYPIXEL_KEY}`)
        .then(resource => resource.data)
        .then(response => response?.data)
        .catch(e => console.log(`Error retrieving ${uuid}. Error: ${e.message}`))
        .finally(() => {
            return {}
        })
}

function getUuidByUsername(username) {
    return fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`)
        .then(res => res.data?.id)
}