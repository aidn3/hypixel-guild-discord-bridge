/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { evalExpression } from '@hkh12/node-calc'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Calculate extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['calculate', 'calc', 'c', 'math'],
      description: 'A basic calculator',
      example: `calc 1+1`
    })
  }

  handler(context: ChatCommandContext): string {
    if (context.args.length === 0) return this.getExample(context.commandPrefix)

    let expression = context.args.join(' ')
    expression = this.normalize(expression)

    if (!this.assertValidCharacters(expression) || !this.assertValidDecimal(expression)) {
      return context.app.i18n.t(($) => $['commands.math.invalid'], { username: context.username })
    }

    expression = this.expandSuffix(context, expression)

    try {
      const result = evalExpression(expression)

      // The following if-statement is purely an Easter egg
      // It can be removed without causing any adverse affects on the bridge
      if (result <= 50 && result >= -50 && Math.random() < 0.2) {
        return context.app.i18n.t(($) => $['commands.math.response.easter'], {
          username: context.username,
          result: result
        })
      }

      return context.app.i18n.t(($) => $['commands.math.response'], { username: context.username, result: result })
    } catch {
      return context.app.i18n.t(($) => $['commands.math.invalid'], { username: context.username })
    }
  }

  private normalize(expression: string): string {
    return expression
      .replaceAll(':', '/') // division / ratio support
      .replaceAll('x', '*') // x is also used for multiplication
      .replaceAll(',', '') // removes commas from numbers
  }

  private assertValidCharacters(expression: string): boolean {
    // Only ascii
    // eslint-disable-next-line no-control-regex
    return /[\u0000-\u007F]/g.test(expression)
  }

  private assertValidDecimal(expression: string): boolean {
    const regex = /([\d.]+)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(expression)) !== null) {
      const part = match[1]
      // multiple commas found
      if (part.indexOf('.') !== part.lastIndexOf('.')) {
        return false
      }
    }

    return true
  }

  private expandSuffix(context: ChatCommandContext, expression: string): string {
    let match: RegExpExecArray | null
    while ((match = /([\d.]+)([kmbt])(?=\b)/gi.exec(expression)) !== null) {
      const start = match.index
      const length = match[0].length
      const numberString = match[1]

      const number = Number.parseFloat(numberString)
      const suffix = match[2].toLowerCase() as 'k' | 'm' | 'b' | 't'
      let resultTransformation: number
      switch (suffix) {
        case 'k': {
          resultTransformation = number * 1000
          break
        }
        case 'm': {
          resultTransformation = number * 1_000_000
          break
        }
        case 'b': {
          resultTransformation = number * 1_000_000_000
          break
        }
        case 't': {
          resultTransformation = number * 1_000_000_000_000
          break
        }
        default: {
          suffix satisfies never
          return context.app.i18n.t(($) => $['commands.math.invalid'], { username: context.username })
        }
      }

      expression = expression.slice(0, start) + resultTransformation.toString(10) + expression.slice(start + length)
    }

    return expression
  }
}
