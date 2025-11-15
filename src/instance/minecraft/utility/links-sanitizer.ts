import DefaultAxios from 'axios'

import type { MinecraftConfigurations } from '../../../core/minecraft/minecraft-configurations'
import { stufEncode } from '../common/stuf.js'

export class LinksSanitizer {
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

      const response = await DefaultAxios.head(part).catch(() => undefined)
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
