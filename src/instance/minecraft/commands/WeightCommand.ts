/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandMessage} from "../common/ChatInterface"
import {AxiosResponse} from "axios"

const axios = require("axios")

export default <MinecraftCommandMessage>{
    triggers: ['weight', 'w'],
    enabled: true,
    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {

        let givenUsername = args[0] !== undefined ? args[0] : username
        return `${givenUsername}'s weight: ${await getSenitherData(givenUsername)}`
    }
}

async function getSenitherData(username: string) {
    let profiles: any[] = await axios(`https://sky.shiiyu.moe/api/v2/profile/${username}`)
        .then((res: AxiosResponse) => res.data["profiles"])

    let weight = Object.values(profiles)
        .find(profile => profile["current"])["data"]["weight"]["senither"]

    return Math.floor(weight.overall || 0)
}
