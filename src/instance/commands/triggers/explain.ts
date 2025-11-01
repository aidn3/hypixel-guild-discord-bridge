import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Explain extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['explain', 'e'],
      description: 'Returns an explanation of the bot',
      example: `explain`
    })
  }

  handler(context: ChatCommandContext): string {
    return context.app.i18n.t(($) => $['commands.explain'], {
      username: context.username,
      commandPrefix: context.commandPrefix
    })
  }
}
