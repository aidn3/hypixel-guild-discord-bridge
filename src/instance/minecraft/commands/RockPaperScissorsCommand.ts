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
} satisfies ChatCommandHandler
