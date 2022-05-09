/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const fetch = require("axios");

const MARO_ENDPOINT = "https://maro.skybrokers.xyz/api/networth/categories"
const HYPIXEL_KEY = process.env.HYPIXEL_KEY

module.exports = {
    triggers: ['networth', 'net', 'nw'],
    handler: async function (clientInstance, reply, username, args) {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await getUuidByUsername(givenUsername)

        if (!uuid) {
            reply(`No such username! (given: ${givenUsername})`)
            return
        }

        let localNetworth = await skyblockProfiles(uuid)
            .then(profiles => profiles.map(p => p.members[uuid]))
            .then(getSelectedProfile)
            .then(networth)
            .then(res => res.data.data.networth)
            .then(localizedNetworth)
        reply(`${givenUsername}'s networth: ${localNetworth}`)
    }
}

function getUuidByUsername(username) {
    return fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`)
        .then(res => res.data?.id)
}

function skyblockProfiles(uuid) {
    return fetch(`https://api.hypixel.net/skyblock/profiles?key=${HYPIXEL_KEY}&uuid=${uuid}`)
        .then(res => res.data?.profiles)
}

function networth(profile) {
    return fetch.post(MARO_ENDPOINT, {data: profile})
}

function getSelectedProfile(profiles) {
    let selectedProfile = profiles[0]
    for (let profile of profiles) {
        if (profile.last_save > selectedProfile.last_save) {
            selectedProfile = profile
        }
    }
    console.log(`Selected profile death count: ${selectedProfile["death_count"]}`)
    return selectedProfile
}

function localizedNetworth(coins) {
    console.log(`Current coins: ${coins}`)
    let suffix = ""
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "k"
    }
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "m"
    }
    if (coins > 1000) {
        coins = coins / 1000
        suffix = "b"
    }

    return coins.toFixed(3) + suffix
}