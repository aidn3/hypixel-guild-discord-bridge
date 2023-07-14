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

        return `${givenUsername} is Catacombs ` +
            `${parsedProfile.dungeons.types.catacombs.level}.${parsedProfile.dungeons.types.catacombs.progress}` +
            ` ${formatClass(parsedProfile.dungeons.classes)}.`
    }
}

async function getParsedProfile(hypixelApi: Client, uuid: string) {
    const selectedProfile = await hypixelApi.getSkyblockProfiles(uuid, {raw: true})
        .then((response: any) => response.profiles)
        .then((profiles: any[]) => profiles.filter(p => p.selected)[0].cute_name)

    return await hypixelApi.getSkyblockProfiles(uuid)
        .then(profiles => profiles.filter(profile => profile.profileName === selectedProfile)[0].me)
}

function formatClass(classes: any): string {
    let xp: number = 0
    let level: number = 0
    let name: string = "(None)"

    if (classes.healer.xp > xp) {
        xp = classes.healer.xp
        level = Number(classes.healer.level) + (classes.healer.progress / 100)
        name = "Healer"
    }
    if (classes.mage.xp > xp) {
        xp = classes.mage.xp
        level = Number(classes.mage.level) + (classes.mage.progress / 100)
        name = "Mage"
    }
    if (classes.berserk.xp > xp) {
        xp = classes.berserk.xp
        level = Number(classes.berserk.level) + (classes.berserk.progress / 100)
        name = "Berserk"
    }
    if (classes.archer.xp > xp) {
        xp = classes.archer.xp
        level = Number(classes.archer.level) + (classes.archer.progress / 100)
        name = "Archer"
    }
    if (classes.tank.xp > xp) {
        xp = classes.tank.xp
        level = Number(classes.tank.level) + (classes.tank.progress / 100)
        name = "Tank"
    }
    return `${name} ${level.toFixed(2)}`
}
