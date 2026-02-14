import { setImmediate } from 'node:timers/promises'

import type { Content } from '../../../common/application-event'
import { ContentType } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import MinecraftRenderer from '../../../utility/minecraft-renderer'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  parseEncodedNbt,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Inventory extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['inventory', 'inv', 'hotbar', 'renderinv', 'renderinventory'],
      description: "Render a player's Skyblock inventory",
      example: `inventory %s 1`
    })
  }

  async handler(context: ChatCommandContext): Promise<Content | string> {
    const givenUsername = context.args[0] ?? context.username
    const givenBar = context.args[1] ?? '1'

    if (!MinecraftRenderer.renderSupported()) {
      return context.app.i18n.t(($) => $['commands.error.minecraft-render-not-supported-on-host'])
    }

    if (!/^\d$/g.test(givenBar)) {
      return this.getExample(context.commandPrefix)
    }

    const parsedBar = Number.parseInt(givenBar, 10)
    if (parsedBar < 1 || parsedBar > 4) {
      return context.app.i18n.t(($) => $['commands.inventory.invalid-slot'], { username: givenUsername })
    }

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const inventoryRaw = selectedProfile.inventory?.inv_contents?.data
    if (inventoryRaw === undefined) {
      return context.app.i18n.t(($) => $['commands.inventory.no-api'], { username: givenUsername })
    }

    const inventory = await parseEncodedNbt<{ i: InventoryItem[] }>(inventoryRaw)
    const images = await this.renderBar(inventory.i, parsedBar)
    if (images.length === 0) {
      return context.app.i18n.t(($) => $['commands.inventory.nothing-to-render'], {
        username: givenUsername,
        bar: parsedBar
      })
    }

    return {
      type: ContentType.ImageBased,
      content: images,
      unsupported: context.app.i18n.t(($) => $['commands.inventory.render-not-supported']),
      extra: context.app.i18n.t(($) => $['commands.inventory.render-extra'], {
        username: givenUsername,
        bar: parsedBar
      })
    }
  }

  private async renderBar(slots: InventoryItem[], line: number): Promise<Buffer[]> {
    const BarSize = 9
    const chunk = slots.slice((line - 1) * BarSize, line * BarSize)

    const result: Buffer[] = []
    for (const slot of chunk) {
      if (!('tag' in slot) || slot.Count === 0) continue

      const image = MinecraftRenderer.renderLore(slot.tag.display.Name, slot.tag.display.Lore)
      result.push(image)

      // added delay between rendering to ensure
      // other application tasks have chance to execute without timing out
      await setImmediate(() => undefined)
    }

    return result
  }
}
/* eslint-disable @typescript-eslint/naming-convention */
type InventoryItem = { id: number; Count: number; tag: ItemData } | object

interface ItemData {
  display: { Name: string; Lore: string[] }
}
/* eslint-enable @typescript-eslint/naming-convention */
