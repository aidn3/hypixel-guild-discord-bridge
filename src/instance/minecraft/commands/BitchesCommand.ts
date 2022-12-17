// noinspection JSUnusedGlobalSymbols

/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import {MinecraftCommandMessage} from "../common/ChatInterface"
import MinecraftInstance from "../MinecraftInstance"

export default <MinecraftCommandMessage>{
    triggers: ['bitch', 'bitches', 'b'],
    enabled: true,

    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
        let givenUsername = args[0] !== undefined ? args[0] : username
        return `${givenUsername} has ${Math.floor(Math.random() * 10)} b's`
    }
}