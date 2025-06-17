import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

enum CommandOptions {
  Rock = 'rock',
  Paper = 'paper',
  Scissors = 'scissors'
}

export default class RockPaperScissors extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['rps'],
      description: 'Play rock, paper, scissors against the bot',
      example: `rps rock`
    })
  }

  handler(context: ChatCommandContext): string {
    const choices = Object.values(CommandOptions)
    const computerChoice = choices[Math.floor(Math.random() * choices.length)]
    const userChoice = context.args[0] as CommandOptions | undefined

    if (userChoice == undefined || !choices.includes(userChoice)) {
      return `${context.username}, choose rock, paper or scissors!`
    }

    if (userChoice === computerChoice) {
      return `${context.username}, I chose ${computerChoice}, We tied!`
    } else if (
      (userChoice === CommandOptions.Paper && computerChoice === CommandOptions.Rock) ||
      (userChoice === CommandOptions.Scissors && computerChoice === CommandOptions.Paper) ||
      (userChoice === CommandOptions.Rock && computerChoice === CommandOptions.Scissors)
    ) {
      return `${context.username}, I chose ${computerChoice}, You won!`
    } else {
      return `${context.username}, I chose ${computerChoice}, You lost!`
    }
  }
}
