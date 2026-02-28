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

export default class Item extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['item', 'render', 'slot', 'renderslot', 'renderitem'],
      description: "Render a slot in a player's Skyblock profile",
      example: `item 1 %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<Content | string> {
    const givenBar = context.args[0] ?? '1'
    const givenUsername = context.args[1] ?? context.username

    if (!MinecraftRenderer.renderSupported()) {
      return context.app.i18n.t(($) => $['commands.error.minecraft-render-not-supported-on-host'])
    }

    if (!/^\d$/g.test(givenBar)) {
      return this.getExample(context.commandPrefix)
    }

    const parsedBar = Number.parseInt(givenBar, 10)
    if (parsedBar < 1 || parsedBar > 36) {
      return context.app.i18n.t(($) => $['commands.item.invalid-slot'], { username: givenUsername })
    }

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const inventoryRaw = selectedProfile.inventory?.inv_contents?.data
    if (inventoryRaw === undefined) {
      return context.app.i18n.t(($) => $['commands.item.no-api'], { username: givenUsername })
    }

    const inventory = await parseEncodedNbt<{ i: InventoryItem[] }>(inventoryRaw)
    const slot = inventory.i[parsedBar - 1]
    if (!('tag' in slot) || slot.Count === 0) {
      return context.app.i18n.t(($) => $['commands.item.nothing-to-render'], {
        username: givenUsername,
        slot: parsedBar
      })
    }

    const image = MinecraftRenderer.renderLore(slot.tag.display.Name, slot.tag.display.Lore)

    return {
      type: ContentType.ImageBased,
      content: [image],
      unsupported: context.app.i18n.t(($) => $['commands.item.render-not-supported']),
      extra: context.app.i18n.t(($) => $['commands.item.render-extra'], {
        username: givenUsername,
        slot: parsedBar
      })
    }
  }
}
/* eslint-disable @typescript-eslint/naming-convention */
type InventoryItem = { id: number; Count: number; tag: ItemData } | object

interface ItemData {
  display: { Name: string; Lore: string[] }
}
/* eslint-enable @typescript-eslint/naming-convention */
