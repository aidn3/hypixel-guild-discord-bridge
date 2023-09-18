import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

export default {
  triggers: ['rps'],
  enabled: true,

  handler: function (context: ChatCommandContext): string {
    const choices = ['rock', 'paper', 'scissors']
    const computerChoice = choices[Math.floor(Math.random() * choices.length)]
    const userChoice = context.args[0]

    if (!choices.includes(userChoice)) {
      return `${context.username}, choose rock, paper or scissors!`
    }

    if (userChoice === computerChoice) {
      return `${context.username}, I chose ${computerChoice}, We tied!`
    }

    if (userChoice === 'paper') {
      if (computerChoice === 'rock') {
        return `${context.username}, I chose ${computerChoice}, You won!`
      }
    }

    if (userChoice === 'scissors') {
      if (computerChoice === 'paper') {
        return `${context.username}, I chose ${computerChoice}, You won!`
      }
    }

    if (userChoice === 'rock') {
      if (computerChoice === 'scissors') {
        return `${context.username}, I chose ${computerChoice}, You won!`
      }
    }

    return `${context.username}, I chose ${computerChoice}, You lost!`
  }
} satisfies ChatCommandHandler
