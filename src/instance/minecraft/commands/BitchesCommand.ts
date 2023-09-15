/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  triggers: ['bitch', 'bitches', 'b'],
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    const givenUsername = context.args[0] ?? context.username
    return `${givenUsername} has ${Math.floor(Math.random() * 10)} b's`
  }
} satisfies ChatCommandHandler
