/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { MinecraftCommandMessage } from '../common/ChatInterface'
import MinecraftInstance from '../MinecraftInstance'

export default {
  triggers: ['bitch', 'bitches', 'b'],
  enabled: true,

  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const givenUsername = args[0] ?? username
    return `${givenUsername} has ${Math.floor(Math.random() * 10)} b's`
  }
} satisfies MinecraftCommandMessage
