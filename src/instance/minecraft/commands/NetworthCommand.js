/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
const Mojang = require("mojang")
const {getNetworth, localizedNetworth} = require("../../../util/SkyblockApi")

module.exports = {
    triggers: ['networth', 'net', 'nw'],
    handler: async function (clientInstance, username, args) {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await Mojang.lookupProfileAt(givenUsername)
            .then(mojangProfile => mojangProfile.id)

        if (!uuid) {
            return `No such username! (given: ${givenUsername})`
        }

        let networthLocalized = await clientInstance.app.hypixelApi.getSkyblockProfiles(uuid, {raw: true})
            .then(response => response.profiles)
            .then(profiles => profiles.filter(p => p.selected)[0])
            .then(res => getNetworth(res.members[uuid], res.banking?.balance || 0))
            .then(localizedNetworth)

        return `${givenUsername}'s networth: ${networthLocalized}`
    }
}
