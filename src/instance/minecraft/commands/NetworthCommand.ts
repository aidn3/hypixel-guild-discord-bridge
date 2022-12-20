/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandMessage} from "../common/ChatInterface"

const Mojang = require("mojang")
const {getNetworth, localizedNetworth} = require("../../../util/SkyblockApi")

export default <MinecraftCommandMessage>{
    triggers: ['networth', 'net', 'nw'],
    enabled: true,
    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await Mojang.lookupProfileAt(givenUsername)
            .then((mojangProfile: { id: any }) => mojangProfile.id)

        if (!uuid) {
            return `No such username! (given: ${givenUsername})`
        }

        let networthLocalized = await clientInstance.app.hypixelApi.getSkyblockProfiles(uuid, {raw: true})
            .then((response: any) => response.profiles)
            .then((profiles: any[]) => profiles.filter(p => p.selected)[0])
            .then((res: any) => getNetworth(res.members[uuid], res.banking?.balance || 0))
            .then(localizedNetworth)

        return `${givenUsername}'s networth: ${networthLocalized}`
    }
}
