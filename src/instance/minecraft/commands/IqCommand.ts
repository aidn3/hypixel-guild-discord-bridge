/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from '../MinecraftInstance'
import { MinecraftCommandMessage } from '../common/ChatInterface'

export default {
  triggers: ['iq'],
  enabled: true,
  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const givenUsername = args[0] != null ? args[0] : username
    return `${givenUsername} has an IQ of ${Math.floor(Math.random() * 200)}`
  }
} satisfies MinecraftCommandMessage
