import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Rng extends ChatCommandHandler {
  private readonly positiveMessages = [
    'Damn %s. You are so lucky with %d RNG. Marry me, so I can divorce you and take half your RNG :)',
    '%s, your luck is totally average %d',
    '%s, lucky! RNG %d',
    "%s, just because you got %d this time doesn't mean you will always be as lucky -_-",
    '%s, your luck is something to behold. RNG %d!',
    '%s, your RNG is overflowing! RNG %d.',
    '%s, RNG is %d!',
    '%s threw the dice and got %d.'
  ]
  private readonly neutralMessages = [
    '%s, RNG %d!',
    '%s, Good RNG %d!',
    '%s, Average RNG %d!',
    '%s, the dice is rolled and got %d!',
    '%s, hmmmm. RNG %d.',
    '%s, %d :)'
  ]
  private readonly negativeMessages = [
    "%s, why don't you take a break from this game? RNG %d",
    '%s, your luck is totally BELOW average %d',
    '%s, quit while you are still getting SOME rng. RNG %d.',
    '%s, your RNG is so bad it is considered cyberbully to trash talk you at this point. RNG %d.',
    '%s, come on. Give up before you hit negative RNG! RNG %d.',
    "%s, I won't trash talk you out of pity of your rng %d :I",
    '%s, oh wow. RNG %d. Go seethe and whine and throw a tantrum.'
  ]

  constructor() {
    super({
      name: 'RNG',
      triggers: ['rng'],
      description: 'Returns a random number between a range',
      example: `rng 1 5`
    })
  }

  handler(context: ChatCommandContext): string {
    const firstRange = context.args[0] ?? '1'
    const secondRange = context.args[1] ?? '100'

    if (!/^\d+$/g.test(firstRange)) return `${context.username}, first argument must be a number!`
    if (!/^\d+$/g.test(secondRange)) return `${context.username}, second argument must be a number!`

    const firstNumber = Number.parseInt(firstRange, 10)
    const secondNumber = Number.parseInt(secondRange, 10)
    let result: number

    if (firstNumber < secondNumber) {
      result = this.getRandomInt(firstNumber, secondNumber)
    } else if (firstNumber > secondNumber) {
      result = this.getRandomInt(secondNumber, firstNumber)
    } else {
      result = firstNumber
    }

    const max = Math.abs(firstNumber - secondNumber)
    const min = Math.min(firstNumber, secondNumber)
    const percentage = (result - min) / max

    if (Math.abs(firstNumber - secondNumber) < 10) {
      return this.randomMessage(context, this.neutralMessages, result)
    } else if (percentage >= 0.8) {
      return this.randomMessage(context, this.positiveMessages, result)
    } else if (percentage <= 0.4) {
      return this.randomMessage(context, this.negativeMessages, result)
    } else {
      return this.randomMessage(context, this.neutralMessages, result)
    }
  }

  // https://stackoverflow.com/a/1527820
  private getRandomInt(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private randomMessage(context: ChatCommandContext, messages: string[], number: number): string {
    return messages[Math.floor(Math.random() * messages.length)]
      .replaceAll('%s', context.username)
      .replaceAll('%d', number.toString(10))
  }
}
