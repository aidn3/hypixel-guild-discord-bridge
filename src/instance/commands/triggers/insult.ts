import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Insult extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['insult'],
      description: 'insult a player',
      example: `insult %s`
    })
  }

  handler(context: ChatCommandContext): string {
    const givenUsername = context.args[0] ?? context.username

    const messages = context.app.i18n.t(($) => $['commands.insult'], { returnObjects: true, name: givenUsername })
    let message = messages[Math.floor(Math.random() * messages.length)]
    message = message.replaceAll('{username}', givenUsername)

    return message
  }
}
