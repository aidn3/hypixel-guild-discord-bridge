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

export default class Equipments extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['eq', 'equipments', 'equipment', 'equip'],
      description: "Returns a player's Skyblock equipments",
      example: `eq %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<Content | string> {
    const givenUsername = context.args[0] ?? context.username

    if (!MinecraftRenderer.renderSupported()) {
      return context.app.i18n.t(($) => $['commands.error.minecraft-render-not-supported-on-host'])
    }

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const armorRaw = selectedProfile.inventory?.equipment_contents?.data
    if (armorRaw === undefined) {
      return context.app.i18n.t(($) => $['commands.equipments.none-maybe'], { username: givenUsername })
    }

    const rawSlots = await parseEncodedNbt<{ i: InventoryItem[] }>(armorRaw)

    const slots = rawSlots.i
      .filter((slot) => slot.Count > 0)
      .map((slot) => slot.tag.display)
      .toReversed()
    if (slots.length === 0) {
      return context.app.i18n.t(($) => $['commands.equipments.none'], { username: givenUsername })
    }

    const images = slots.map((slot) => MinecraftRenderer.renderLore(slot.Name, slot.Lore))
    return {
      type: ContentType.ImageBased,
      content: images,
      unsupported: context.app.i18n.t(($) => $['commands.equipments.render-not-supported'])
    }
  }
}
/* eslint-disable @typescript-eslint/naming-convention */
interface InventoryItem {
  id: number
  Count: number
  tag: ItemData
}

interface ItemData {
  display: { Name: string; Lore: string[] }
}
/* eslint-enable @typescript-eslint/naming-convention */
