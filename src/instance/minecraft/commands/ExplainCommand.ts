import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  triggers: ['explain', 'e'],
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    return (
      `${context.username}, I am a robot that connects this chat to discord!` +
      'I have many commands you can use, see them all with !commands'
    )
  }
} satisfies ChatCommandHandler
