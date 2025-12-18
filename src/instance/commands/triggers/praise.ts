import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Praise extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['praise'],
      description: 'praise a player',
      example: `praise %s`
    })
  }

  handler(context: ChatCommandContext): string {
    const givenUsername = context.args[0] ?? context.username

    // easter egg
    const messages =
      Math.random() > 0.01
        ? context.app.i18n.t(($) => $['commands.praise'], { returnObjects: true, name: givenUsername })
        : context.app.i18n.t(($) => $['commands.insult'], { returnObjects: true, name: givenUsername })
    return messages[Math.floor(Math.random() * messages.length)]
  }
}
