/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import type { ChatCommandContext } from '../../../common/commands'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands'

export default class EightBallCommand extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: '8ball',
      triggers: ['8ball', '8balls', '8', 'ball', 'balls', '8b'],
      description: 'Returns a basic 8 ball response',
      example: `8b am I cool?`
    })
  }

  handler(context: ChatCommandContext): string {
    const messages = context.app.i18n.t(($) => $['commands.8ball'], {
      returnObjects: true,
      username: context.username
    })
    const message = messages[Math.floor(Math.random() * messages.length)]
    return message
  }
}
