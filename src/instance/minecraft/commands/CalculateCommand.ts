/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { evalExpression } from '@hkh12/node-calc'
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  triggers: ['calculate', 'calc', 'c'],
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    if (context.args.length === 0) return `${context.username}, example: !calc 1 + 1`

    const expression = context.args.join(' ')
    const result = evalExpression(expression)
    return `${context.username}, ${expression} = ${result}`
  }
} satisfies ChatCommandHandler
