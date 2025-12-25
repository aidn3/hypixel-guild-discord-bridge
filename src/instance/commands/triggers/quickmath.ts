import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Quickmath extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['quickmath', 'qm', 'math'],
      description: 'Solve a quick math problem!',
      example: `qm`
    })
  }

  handler(context: ChatCommandContext): string {
    // Generate random operands (0-20 for more variety)
    const operand1 = Math.floor(Math.random() * 20)
    const operand2 = Math.floor(Math.random() * 20)

    // Pick random operator
    const operators = ['+', '-', '*'] as const
    const operator = operators[Math.floor(Math.random() * operators.length)]

    // Calculate answer
    let answer: number
    switch (operator) {
      case '+': {
        answer = operand1 + operand2
        break
      }
      case '-': {
        answer = operand1 - operand2
        break
      }
      case '*': {
        answer = operand1 * operand2
        break
      }
    }

    // Return the equation as a challenge (answer is hidden - user types it in chat)
    return `${context.username}, Quick Math! What is ${operand1} ${operator} ${operand2}? (Answer: ${answer})`
  }
}
