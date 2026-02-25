/*
 * @author Altpaper <https://github.com/Altpapier>
 * @license MIT <https://github.com/Altpapier/hypixel-discord-guild-bridge/blob/master/LICENSE>
 * @see https://github.com/Altpapier/hypixel-discord-guild-bridge/blob/master/helper/loreRenderer.js
 * @see https://github.com/Altpapier/hypixel-discord-guild-bridge/blob/master/helper/messageToImage.js
 */
import assert from 'node:assert'
import process from 'node:process'

import { createCanvas, registerFont } from 'canvas'

registerFont('./resources/fonts/minecraft-regular.ttf', { family: 'Minecraft' })
registerFont('./resources/fonts/minecraft-bold.otf', { family: 'MinecraftBold' })
registerFont('./resources/fonts/minecraft-italic.otf', { family: 'MinecraftItalic' })
registerFont('./resources/fonts/minecraft-unicode.ttf', { family: 'MinecraftUnicode' })

class MinecraftRenderer {
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

  public renderSupported(): boolean {
    // BUG: image renderer (PANGO library compiled in C) has trouble recognizing fonts on Windows platforms.
    // running in on Windows will spit out errors on process level outside Node.js control
    if (process.platform === 'win32') return false

    // Although it is true for now, might consider checking for cpu arch if problems encountered
    // since ARM arch sometimes doesn't compile the source code properly
    return true
  }

  public renderLore(itemName: string | undefined, lore: string[]): Buffer {
    assert.strictEqual(this.renderSupported(), true, 'can not render minecraft images right now')

    if (itemName) lore.unshift(itemName)
    const measurements = this.getLoreCanvasWidthAndHeight(lore)
    const canvas = createCanvas(measurements.width, measurements.height)
    const context = canvas.getContext('2d')
    // BACKGROUND
    context.fillStyle = '#100110'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // FONT
    context.shadowOffsetX = 3
    context.shadowOffsetY = 3
    context.shadowColor = '#131313'
    context.font = '24px Minecraft'
    context.fillStyle = '#ffffff'

    // TEXT
    for (const [index, item] of lore.entries()) {
      let width = 10
      const splitItem = item.split('§')
      if (splitItem[0].length === 0) splitItem.shift()

      for (const toRenderItem of splitItem) {
        context.fillStyle = MinecraftRenderer.RgbaColor[toRenderItem[0]]

        if (toRenderItem.startsWith('l')) context.font = '24px MinecraftBold, MinecraftUnicode'
        else if (toRenderItem.startsWith('o')) context.font = '24px MinecraftItalic, MinecraftUnicode'
        else context.font = '24px Minecraft, MinecraftUnicode'

        context.fillText(toRenderItem.slice(1), width, index * 24 + 29)
        width += context.measureText(toRenderItem.slice(1)).width
      }
    }

    return canvas.toBuffer()
  }

  public generateMessageImage(message: string): Buffer {
    assert.strictEqual(this.renderSupported(), true, 'can not render minecraft images right now')

    const canvasHeight = this.getMessageHeight(message)
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

    let width = MinecraftRenderer.WidthMargin
    let height = 35 * this.sizeMultiplier
    for (const segment of splitMessage) {
      const colorCode = MinecraftRenderer.RgbaColor[segment.charAt(0)]
      const currentMessage = segment.slice(1)
      if (width + context.measureText(currentMessage).width > 1000 || segment.startsWith('n')) {
        width = MinecraftRenderer.WidthMargin
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

  private getLoreCanvasWidthAndHeight(lore: string[]): { width: number; height: number } {
    const canvas = createCanvas(1, 1)
    const context = canvas.getContext('2d')
    context.font = '24px Minecraft'

    let highestWidth = 0
    for (const element of lore) {
      const width = context.measureText(element.replaceAll(/\u00A7[0-9A-FK-OR]/gi, '')).width
      if (width > highestWidth) {
        highestWidth = width
      }
    }

    return { height: lore.length * 24 + 15, width: highestWidth + 20 }
  }

  private getMessageHeight(message: string): number {
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

    let width = MinecraftRenderer.WidthMargin
    let height = 35 * this.sizeMultiplier

    for (const segment of splitMessage) {
      const currentMessage = segment.slice(1)
      if (width + context.measureText(currentMessage).width > 1000 || segment.startsWith('n')) {
        width = MinecraftRenderer.WidthMargin
        height += 40 * this.sizeMultiplier
      }
      width += context.measureText(currentMessage).width
    }
    if (width == 5) height -= 40 * this.sizeMultiplier

    return height + 10 * this.sizeMultiplier
  }
}

export default new MinecraftRenderer()
