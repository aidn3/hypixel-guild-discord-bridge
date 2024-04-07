import { type ChatCommandContext, ChatCommandHandler } from '../common/command-interface.js'

export default class DarkAuction extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Darkauction',
      triggers: ['da', 'darkauction'],
      description: 'Show the remaining time till next Dark Auction',
      example: 'da'
    })
  }

  handler(context: ChatCommandContext): Promise<string> | string {
    const date = new Date()
    const currentMinute = date.getUTCMinutes()

    const result = currentMinute >= 55 ? 115 - currentMinute : 55 - currentMinute
    return `${context.username}, Dark Auction in ${result} minutes!`
  }
}
