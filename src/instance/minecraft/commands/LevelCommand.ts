import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandMessage} from "../common/ChatInterface"

const Mojang = require("mojang")

export default <MinecraftCommandMessage>{
    triggers: ['level', 'lvl', 'l'],
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
            .then((res: any) => res.members[uuid]?.leveling?.experience ?? 0)
            .then(exp => (exp / 100).toFixed(2))

        return `${givenUsername}'s level: ${networthLocalized}`
    }
}
