import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Coinflip extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['coinflip', 'coinf'],
      description: 'flip a coin',
      example: `coinflip %s`
    })
  }

  handler(context: ChatCommandContext): string {
    const givenName = context.args[0] ?? context.username

    // 1 / 1000 chance for it to land on its side
    if (Math.floor(Math.random() * 1000) === 0) {
      return context.app.i18n.t(($) => $['commands.coinflip.special'], { username: givenName })
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails'

    const messages = context.app.i18n.t(($) => $[`commands.coinflip.${result}`], {
      returnObjects: true,
      name: givenName
    })

    const message = messages[Math.floor(Math.random() * messages.length)]

    return message.replaceAll('{name}', givenName)
  }
}
