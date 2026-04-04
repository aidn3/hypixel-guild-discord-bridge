import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

type DiceType = 'normal' | 'highclass'

export default class Dice extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['dice'],
      description: 'Roll an Archfiend Dice',
      example: `dice highclass`
    })
  }

  handler(context: ChatCommandContext): string {
    const parsedType = context.args.length === 0 ? 'normal' : this.parseType(context.args[0].toLowerCase())

    if (parsedType === undefined) {
      return `${context.username}, try ${context.commandPrefix}dice or ${context.commandPrefix}dice highclass.`
    }

    const result = this.roll(parsedType)
    return `${context.username}, ${this.getRollMessage(parsedType, result)}`
  }

  private parseType(givenType: string): DiceType | undefined {
    if (['normal', 'regular', 'archfiend'].includes(givenType)) return 'normal'
    if (['highclass', 'high-class', 'high', 'hc'].includes(givenType)) return 'highclass'
    return undefined
  }

  private roll(type: DiceType): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
    const sevenChance = type === 'normal' ? 1 / 6666 : 1 / 666
    if (Math.random() < sevenChance) return 7

    const sixChance = type === 'normal' ? 1 / 24 : 1 / 16
    if (Math.random() < sixChance) return 6

    return (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5
  }

  private getRollMessage(type: DiceType, result: 1 | 2 | 3 | 4 | 5 | 6 | 7): string {
    const diceName = type === 'normal' ? 'Archfiend Dice' : 'High Class Archfiend Dice'
    const bonuses =
      type === 'normal'
        ? ['-120❤', '-60❤', '-30❤', '+30❤', '+60❤', '+120❤']
        : ['-300❤', '-200❤', '-100❤', '+100❤', '+200❤', '+300❤']

    if (result === 7) {
      return `your ${diceName} rolled a 7! Wait, a 7? But dice only have 6 sides... Hm...? The Dice broke apart, revealing an Archfiend Dye hidden within!`
    }

    if (result === 6) {
      return `your ${diceName} rolled a 6! Nice! Bonus: ${bonuses[5]}`
    }

    return `your ${diceName} rolled a ${result}! Bonus: ${bonuses[result - 1]}`
  }
}
