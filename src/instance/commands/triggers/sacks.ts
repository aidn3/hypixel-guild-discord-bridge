import { getPrices } from 'skyhelper-networth'

import type { Content } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { shortenNumber } from '../../../utility/shared-utility'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Sacks extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['sacks', 'sack', 'sax'],
      description: "Returns a player's SkyBlock sacks content value",
      example: `sacks %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<Content | string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const entries = selectedProfile.inventory?.sacks_counts ?? {}

    let bazaarTotalValue = 0
    let npcTotalValue = 0
    if (Object.entries(entries).length > 0) {
      const npcProducts = await context.app.hypixelApi.getSkyblockItems()
      const bazaarProducts = await context.app.hypixelApi.getSkyblockBazaar()
      const skyhelperPrices = await getPrices()

      for (const [name, count] of Object.entries(entries)) {
        if (count === 0) continue
        let bazaarPrice: number
        const npcPrice = npcProducts.items.find((item) => item.id === name)?.npc_sell_price ?? 0

        /*
         * Prioritize official prices.
         * Skyhelper prices are fallback for items that can be not easily fetched.
         */
        if (name in bazaarProducts) {
          const bazaarProduct = bazaarProducts[name]
          bazaarPrice =
            bazaarProduct.sell_summary.length > 0
              ? bazaarProduct.sell_summary[0].pricePerUnit
              : bazaarProduct.quick_status.sellPrice
        } else if (name in skyhelperPrices) {
          bazaarPrice = skyhelperPrices[name]
        } else {
          continue
        }

        bazaarTotalValue += count * bazaarPrice
        npcTotalValue += count * npcPrice
      }
    }

    return context.app.i18n.t(($) => $['commands.sacks.response'], {
      username: givenUsername,
      bazaarValue: shortenNumber(bazaarTotalValue),
      npcValue: shortenNumber(npcTotalValue)
    })
  }
}
