import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'

enum CommandOptions {
  ROCK = 'rock',
  PAPER = 'paper',
  SCISSORS = 'scissors'
}

export default class RockPaperScissors extends ChatCommandHandler {
  constructor() {
    super({
      name: 'RPS',
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
      (userChoice === CommandOptions.PAPER && computerChoice === CommandOptions.ROCK) ||
      (userChoice === CommandOptions.SCISSORS && computerChoice === CommandOptions.PAPER) ||
      (userChoice === CommandOptions.ROCK && computerChoice === CommandOptions.SCISSORS)
    ) {
      return `${context.username}, I chose ${computerChoice}, You won!`
    } else {
      return `${context.username}, I chose ${computerChoice}, You lost!`
    }
  }
}
