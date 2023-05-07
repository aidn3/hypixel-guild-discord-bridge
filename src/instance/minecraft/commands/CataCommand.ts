import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandMessage} from "../common/ChatInterface"
import {Client} from "hypixel-api-reborn";

const Mojang = require("mojang")

export default <MinecraftCommandMessage>{
    triggers: ['catacomb', 'cata'],
    enabled: true,
    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await Mojang.lookupProfileAt(givenUsername)
            .then((mojangProfile: { id: any }) => mojangProfile.id)

        if (!uuid) {
            return `No such username! (given: ${givenUsername})`
        }

        const parsedProfile = await getParsedProfile(clientInstance.app.hypixelApi, uuid)

        return `${givenUsername}'s Catacombs: ` +
            `Level: ${parsedProfile.dungeons.types.catacombs.level}.${parsedProfile.dungeons.types.catacombs.progress}` +
            `/ Healer: ${parsedProfile.dungeons.classes.healer.level}` +
            `/ Mage: ${parsedProfile.dungeons.classes.mage.level}` +
            `/ Berserk: ${parsedProfile.dungeons.classes.berserk.level}` +
            `/ Archer: ${parsedProfile.dungeons.classes.archer.level}` +
            `/ Tank: ${parsedProfile.dungeons.classes.tank.level}`
    }
}

async function getParsedProfile(hypixelApi: Client, uuid: string) {
    const selectedProfile = await hypixelApi.getSkyblockProfiles(uuid, {raw: true})
        .then((response: any) => response.profiles)
        .then((profiles: any[]) => profiles.filter(p => p.selected)[0].cute_name)

    return await hypixelApi.getSkyblockProfiles(uuid)
        .then(profiles => profiles.filter(profile => profile.profileName === selectedProfile)[0].me)
}
