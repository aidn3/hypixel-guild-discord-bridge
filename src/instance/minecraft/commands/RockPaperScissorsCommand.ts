import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

enum CommandOptions {
  ROCK = 'rock',
  PAPER = 'paper',
  SCISSORS = 'scissors'
}

export default {
  triggers: ['rps'],
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    const choices = Object.values(CommandOptions)
    const computerChoice = choices[Math.floor(Math.random() * choices.length)]
    const userChoice = context.args[0] as CommandOptions | undefined

    if (userChoice == null || !choices.includes(userChoice)) {
      return `${context.username}, choose rock, paper or scissors!`
    }

    if (userChoice === computerChoice) {
      return `${context.username}, I chose ${computerChoice}, We tied!`
    }

    if (userChoice === CommandOptions.PAPER && computerChoice === CommandOptions.ROCK) {
      return `${context.username}, I chose ${computerChoice}, You won!`
    }

    if (userChoice === CommandOptions.SCISSORS && computerChoice === CommandOptions.PAPER) {
      return `${context.username}, I chose ${computerChoice}, You won!`
    }

    if (userChoice === CommandOptions.ROCK && computerChoice === CommandOptions.SCISSORS) {
      return `${context.username}, I chose ${computerChoice}, You won!`
    }

    return `${context.username}, I chose ${computerChoice}, You lost!`
  }
} satisfies ChatCommandHandler
