/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Iq extends ChatCommandHandler {
  constructor() {
    super({
      name: 'IQ',
      triggers: ['iq'],
      description: "Returns a player's IQ (0-200)",
      example: `iq %s`
    })
  }

  handler(context: ChatCommandContext): string {
    const givenUsername = context.args[0] ?? context.username
    return `${givenUsername} has an IQ of ${Math.floor(Math.random() * 200)}`
  }
}
