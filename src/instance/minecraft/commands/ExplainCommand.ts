import { MinecraftCommandMessage } from '../common/ChatInterface'
import MinecraftInstance from '../MinecraftInstance'

export default {
  triggers: ['explain', 'e'],
  enabled: true,

  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    return (
      `${username}, I am a robot that connects this chat to discord!` +
      'I have many commands you can use, see them all with !commands'
    )
  }
} satisfies MinecraftCommandMessage
