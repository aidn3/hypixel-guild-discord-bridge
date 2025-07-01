import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Insult extends ChatCommandHandler {
  public static readonly DefaultMessages = [
    '{username} would manage to trip over wireless connection',
    '{username}, if brains were taxed, you’d get a refund',
    '{username} is like a puzzle with half its pieces',
    '{username} plays like their controller’s unplugged',
    '{username}, if laziness were an Olympic sport, you\'d still find a way to come in second',
    '{username} looks like they get dressed in the dark... with mittens on',
    '{username} has a face for podcasts',
    '{username} is like a pop-up ad: loud, pointless, and hard to get rid of'
  ]

  constructor() {
    super({
      triggers: ['insult'],
      description: 'insult a player',
      example: `insult %s`
    })
  }

  handler(context: ChatCommandContext): string {
    const givenUsername = context.args[0] ?? context.username

    const messages = Insult.DefaultMessages
    let message = messages[Math.floor(Math.random() * messages.length)]
    message = message.replaceAll('{username}', givenUsername)

    return message
  }
}
