/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

const Answers = [
  'As I see it, yes.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  "Don't count on it.",
  'It is certain.',
  'It is decidedly so.',
  'Most likely.',
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Outlook good.',
  'Reply hazy, try again.',
  'Signs point to yes.',
  'Very doubtful.',
  'Without a doubt.',
  'Yes.',
  'Yes – definitely.',
  'You may rely on it.'
]

export default class EightBallCommand extends ChatCommandHandler {
  constructor() {
    super({
      name: '8Ball',
      triggers: ['8ball', '8balls', '8', 'ball', 'balls', '8b'],
      description: 'Returns a basic 8 ball response',
      example: `8b am I cool?`
    })
  }

  handler(context: ChatCommandContext): string {
    return `${context.username}, ${Answers[Math.floor(Math.random() * Answers.length)]}`
  }
}
