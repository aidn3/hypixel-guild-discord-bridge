import Axios from 'axios'

import type { ConfigManager } from '../../../common/config-manager.js'
import { stufEncode } from '../common/stuf.js'

import type { SanitizerConfig } from './sanitizer.js'

export class LinksSanitizer {
  constructor(private readonly config: ConfigManager<SanitizerConfig>) {}

  public async process(message: string): Promise<string> {
    if (this.config.data.hideLinksViaStuf) {
      message = stufEncode(message)
    } else if (this.config.data.resolveHideLinks) {
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
          if (part.startsWith('https:') || part.startsWith('http')) return '(link)'
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

      const response = await Axios.head(part).catch(() => undefined)
      if (response === undefined) {
        newMessage.push('(link)')
        continue
      }

      const contentType = response.headers['content-type'] as undefined as string | undefined
      if (typeof contentType !== 'string') {
        newMessage.push('(link)')
        continue
      }

      const type = contentType.split('/')[0]
      if (type === 'image') newMessage.push('(image)')
      else if (type === 'video') newMessage.push('(video)')
      else if (contentType.includes('application/pdf')) newMessage.push('(pdf)')
      else newMessage.push('(link)')
    }

    return newMessage.join(' ')
  }
}
