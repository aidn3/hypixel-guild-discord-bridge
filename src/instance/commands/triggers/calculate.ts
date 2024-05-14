/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { evalExpression } from '@hkh12/node-calc'

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'

export default class Calculate extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Calculate',
      triggers: ['calculate', 'calc', 'c'],
      description: 'A basic calculator',
      example: `calc 1+1`
    })
  }

  handler(context: ChatCommandContext): string {
    if (context.args.length === 0) return `${context.username}, example: !calc 1 + 1`

    const expression = context.args
      .join(' ')
      .replaceAll(':', '/') // division / ratio support
      .replaceAll('x', '*') // x is also used for multiplication
      .replaceAll(',', '') // removes commas from numbers

    const result = evalExpression(expression)

    // The following if-statement is purely an Easter egg
    // It can be removed without causing any adverse affects on the bridge
    if (result <= 50 && result >= -50 && Math.random() < 0.2) {
      return `${context.username} haiyaaaaaaaaa this is so easy, you're a disappointement *takes off slipper* (answer: ${result.toLocaleString()})`
    }

    return `${context.username}, answer: ${result.toLocaleString()}`
  }
}
