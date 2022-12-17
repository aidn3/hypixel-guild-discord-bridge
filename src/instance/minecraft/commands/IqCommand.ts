/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandMessage} from "../common/ChatInterface"

export default <MinecraftCommandMessage>{
    triggers: ['iq'],
    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
        let givenUsername = args[0] !== undefined ? args[0] : username
        return `${givenUsername} has an IQ of ${Math.floor(Math.random() * 200)}`
    }
}