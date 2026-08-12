import { parse } from 'prismarine-nbt'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { SkyblockMember } from '../../../core/hypixel/hypixel-skyblock'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class AccessoryPower extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'magical-power',
      triggers: ['accessorypower', 'ap', 'power', 'accessories', 'acc', 'talisman', 'talismans', 'talismen', 'mp'],
      description: "Returns a player's highest recorded SkyBlock Accessory Power",
      example: `mp %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const highestAccessoryPower = selectedProfile.accessory_bag_storage?.highest_magical_power ?? 0
    const stone = selectedProfile.accessory_bag_storage?.selected_power ?? '(none)'
    const enrichments = await this.getEnrichments(selectedProfile)
    const tuning = selectedProfile.accessory_bag_storage?.tuning.slot_0

    let result = `${givenUsername}:`
    result += ` Highest AP ${highestAccessoryPower}`
    result += ` | Stone: ${stone}`

    result += ` | Tuning: `
    if (tuning) {
      const entries = Object.entries(tuning).filter(([, value]) => value > 0)
      entries.sort(([, a], [, b]) => b - a)
      for (const [key, value] of entries) {
        result += `${value.toLocaleString('en-US')}${this.translatePower(key)}`
      }
    } else {
      result += '(none)'
    }

    result += ` | Enrich: `
    if (enrichments.length === 0) result += `(none)`
    else {
      const formatted: string[] = []
      for (const enrichment of enrichments) {
        formatted.push(enrichment.count.toLocaleString('en-US') + this.translatePower(enrichment.name))
      }

      result += formatted.join(', ')
    }

    return result
  }

  private translatePower(power: string): string {
    return power
      .split('_')
      .map((name) => name.slice(0, 1))
      .join('')
  }

  private async getEnrichments(member: SkyblockMember): Promise<{ name: string; count: number }[]> {
    const bagRaw = member.inventory?.bag_contents?.talisman_bag
    if (bagRaw === undefined) return []

    const parsed = await parse(Buffer.from(bagRaw.data, 'base64'))
    // @ts-expect-error too nested
    const slots: InventorySlot[] = parsed.parsed.value.i.value.value as InventorySlot[]

    const result: { name: string; count: number }[] = []
    for (const slot of slots) {
      if (!('tag' in slot)) continue

      const enrichment = slot.tag.value.ExtraAttributes?.value.talisman_enrichment?.value
      if (!enrichment) continue

      let type = result.find((entry) => entry.name === enrichment)
      if (type == undefined) {
        type = { name: enrichment, count: 0 }
        result.push(type)
      }

      type.count++
    }

    result.sort((a, b) => b.count - a.count)
    return result
  }
}

/* eslint-disable @typescript-eslint/naming-convention */
type InventorySlot = InventoryItemSlot | Record<never, never>

interface InventoryItemSlot {
  id: { value: number }
  count: { value: number }
  tag: {
    value: {
      ExtraAttributes?: {
        value: {
          talisman_enrichment?: { value: string }
        }
      }
    }
  }
}
