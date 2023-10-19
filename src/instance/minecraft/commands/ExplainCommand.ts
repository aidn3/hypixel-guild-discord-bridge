import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  name: 'Explain',
  triggers: ['explain', 'e'],
  description: 'Returns an explanation of the bot',
  example: `explain`,
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    return (
      `${context.username}, I am a robot that connects this chat to discord!` +
      'I have many commands you can use, see them all with !help'
    )
  }
} satisfies ChatCommandHandler
