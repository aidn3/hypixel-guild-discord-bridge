import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class News extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['news', 'sbnews'],
      description: 'Returns the latest skyblock news',
      example: `news`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const news = await context.app.hypixelApi.getSkyblockNews()
    if (!news) return 'No news found right now :/'

    const first = news.items[0]
    return `${first.title} (${first.text})- ${first.link}`
  }
}
