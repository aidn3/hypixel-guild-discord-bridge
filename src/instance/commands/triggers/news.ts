import { XMLParser } from 'fast-xml-parser'
import NodeCache from 'node-cache'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'

interface RssData {
  rss: {
    channel: {
      item: {
        title: string
        link: string
        guid: Record<string, string>
      }[]
    }
  }
}

export default class News extends ChatCommandHandler {
  private readonly cache = new NodeCache({ stdTTL: Duration.minutes(5).toMilliseconds() })

  constructor() {
    super({
      triggers: ['news', 'sbnews', 'patchnotes'],
      description: 'Returns the latest skyblock news',
      example: `news`
    })
  }

  private async getPatchnotes(): Promise<RssData['rss']['channel']['item']> {
    const cached = this.cache.get<RssData['rss']['channel']['item']>('patchnotes')
    if (cached) return cached

    const response = await fetch('https://hypixel.net/forums/skyblock-patch-notes.158/index.rss')
    const xml = await response.text()

    const parser = new XMLParser({ ignoreAttributes: false })
    const patchnotesData: RssData = parser.parse(xml) as RssData

    const items = patchnotesData.rss.channel.item

    this.cache.set('patchnotes', items)
    return items
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const news = await context.app.hypixelApi.getSkyblockNews()
    if (news.items.length === 0) return context.app.i18n.t(($) => $['commands.news.none'])

    const items = await this.getPatchnotes()
    const patchnotes = items[0]

    const update = news.items[0]

    return context.app.i18n.t(($) => $['commands.news.response'], {
      updatesTitle: update.text,
      updatesDate: update.title,
      updatesLink: update.link,
      patchnotesTitle: patchnotes.title,
      patchnotesGuid: patchnotes.guid['#text']
    })
  }
}
