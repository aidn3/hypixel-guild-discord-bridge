import DefaultAxios from 'axios'

import type { MinecraftConfigurations } from '../../../core/minecraft/minecraft-configurations.js'
import Duration from '../../../utility/duration.js'
import { HypixelLink } from '../common/common.js'
import { stufEncode } from '../common/stuf.js'

export class LinksSanitizer {
  private static readonly WhitelistedDomains = [
    'discord.com',
    'cdn.discordapp.com',
    'media.discordapp.net',
    'tenor.com',
    'media1.tenor.com'
  ]
  constructor(private readonly config: MinecraftConfigurations) {}

  public async process(message: string): Promise<string> {
    if (this.config.getHideLinksViaStuf()) {
      message = stufEncode(message)
    } else if (this.config.getResolveHideLinks()) {
      message = await this.resolveLinkHide(message)
    } else {
      message = this.hideLink(message)
    }

    return message
  }

  private hideLink(message: string): string {
    return message
      .split(' ')
      .map((part) => {
        try {
          if ((part.startsWith('https:') || part.startsWith('http')) && !HypixelLink.test(part)) {
            return '(link)'
          }
        } catch {
          /* ignored */
        }
        return part
      })
      .join(' ')
  }

  private async resolveLinkHide(message: string): Promise<string> {
    const newMessage: string[] = []

    for (const part of message.split(' ')) {
      if (!part.startsWith('https:') && !part.startsWith('http')) {
        newMessage.push(part)
        continue
      }
      if (HypixelLink.test(part)) {
        newMessage.push(part)
        continue
      }

      // "host" used instead of "hostname" to ensure default port as well
      if (!LinksSanitizer.WhitelistedDomains.includes(new URL(part).host)) {
        newMessage.push('(link)')
        continue
      }

      const response = await DefaultAxios.head(part, {
        timeout: Duration.seconds(10).toMilliseconds(),
        maxRedirects: 5
      }).catch(() => undefined)
      if (response === undefined) {
        newMessage.push('(link)')
        continue
      }

      const contentType = response.headers['content-type'] as undefined as string | undefined
      if (typeof contentType !== 'string') {
        newMessage.push('(link)')
        continue
      }

      const type = contentType.split('/', 1)[0]
      if (type === 'image') newMessage.push('(image)')
      else if (type === 'video') newMessage.push('(video)')
      else if (contentType.includes('application/pdf')) newMessage.push('(pdf)')
      else newMessage.push('(link)')
    }

    return newMessage.join(' ')
  }
}
