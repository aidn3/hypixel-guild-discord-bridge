import process from 'node:process'

import { createCanvas, registerFont } from 'canvas'

import type { ConfigManager } from '../../../common/config-manager.js'

import type { DiscordConfig } from './discord-config.js'

registerFont('./resources/fonts/MinecraftRegular-Bmg3.ttf', { family: 'Minecraft' })
registerFont('./resources/fonts/unifont.ttf', { family: 'unifont' })

export default class MessageToImage {
  private static readonly RgbaColor: Record<string, string> = {
    /* eslint-disable @typescript-eslint/naming-convention */
    0: 'rgba(0,0,0,1)',
    1: 'rgba(0,0,170,1)',
    2: 'rgba(0,170,0,1)',
    3: 'rgba(0,170,170,1)',
    4: 'rgba(170,0,0,1)',
    5: 'rgba(170,0,170,1)',
    6: 'rgba(255,170,0,1)',
    7: 'rgba(170,170,170,1)',
    8: 'rgba(85,85,85,1)',
    9: 'rgba(85,85,255,1)',
    a: 'rgba(85,255,85,1)',
    b: 'rgba(85,255,255,1)',
    c: 'rgba(255,85,85,1)',
    d: 'rgba(255,85,255,1)',
    e: 'rgba(255,255,85,1)',
    f: 'rgba(255,255,255,1)'
    /* eslint-enable @typescript-eslint/naming-convention */
  }

  private static readonly WidthMargin = 20
  private readonly sizeMultiplier = 0.87

  constructor(private readonly config: ConfigManager<DiscordConfig>) {}

  public shouldRenderImage(): boolean {
    if (!this.config.data.textToImage) return false

    // BUG: image renderer (PANGO library compiled in C) has trouble recognizing fonts on windows platforms.
    // running in on windows will spit out errors on process level outside Node.js control
    if (process.platform === 'win32') return false

    // Although it is true for now, might consider checking for cpu arch if problems encountered
    // since ARM arch sometimes doesn't compile the source code properly
    return true
  }

  public generateMessageImage(message: string) {
    const canvasHeight = this.getHeight(message)
    const canvas = createCanvas(1000, canvasHeight)
    const context = canvas.getContext('2d')
    const splitMessageSpace = message.split(' ')
    for (let index = 0; index < splitMessageSpace.length; index++) {
      const segment = splitMessageSpace[index]
      if (!segment.startsWith('§')) splitMessageSpace[index] = `§r${segment}`
    }

    const splitMessage = splitMessageSpace.join(' ').split(/§|\n/g)
    splitMessage.shift()
    context.shadowOffsetX = 4 * this.sizeMultiplier
    context.shadowOffsetY = 4 * this.sizeMultiplier
    context.shadowColor = '#131313'
    context.antialias = 'none'
    context.font = `${(40 * this.sizeMultiplier).toFixed(0)}px Minecraft, MinecraftUnicode`

    let width = MessageToImage.WidthMargin
    let height = 35 * this.sizeMultiplier
    for (const segment of splitMessage) {
      const colorCode = MessageToImage.RgbaColor[segment.charAt(0)]
      const currentMessage = segment.slice(1)
      if (width + context.measureText(currentMessage).width > 1000 || segment.startsWith('n')) {
        width = MessageToImage.WidthMargin
        height += 40 * this.sizeMultiplier
      }
      if (colorCode) {
        context.fillStyle = colorCode
      }
      context.fillText(currentMessage, width, height)
      width += context.measureText(currentMessage).width
    }
    return canvas.toBuffer()
  }

  private getHeight(message: string): number {
    const canvas = createCanvas(1, 1)
    const context = canvas.getContext('2d')
    const splitMessageSpace = message.split(' ')
    for (let index = 0; index < splitMessageSpace.length; index++) {
      const segment = splitMessageSpace[index]
      if (!segment.startsWith('§')) splitMessageSpace[index] = `§r${segment}`
    }
    const splitMessage = splitMessageSpace.join(' ').split(/§|\n/g)
    splitMessage.shift()
    context.font = `${(40 * this.sizeMultiplier).toFixed(0)}px Minecraft, MinecraftUnicode`

    let width = MessageToImage.WidthMargin
    let height = 35 * this.sizeMultiplier

    for (const segment of splitMessage) {
      const currentMessage = segment.slice(1)
      if (width + context.measureText(currentMessage).width > 1000 || segment.startsWith('n')) {
        width = MessageToImage.WidthMargin
        height += 40 * this.sizeMultiplier
      }
      width += context.measureText(currentMessage).width
    }
    if (width == 5) height -= 40 * this.sizeMultiplier

    return height + 10 * this.sizeMultiplier
  }
}
