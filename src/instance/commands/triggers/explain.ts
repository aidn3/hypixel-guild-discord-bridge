import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'

export default class Explain extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Explain',
      triggers: ['explain', 'e'],
      description: 'Returns an explanation of the bot',
      example: `explain`
    })
  }

  handler(context: ChatCommandContext): string {
    return (
      `${context.username}, I am a robot that connects this chat to discord! ` +
      'I have many commands you can use, see them all with !commands'
    )
  }
}
