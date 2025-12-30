import { getPrices } from 'skyhelper-networth'

import type { Content } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

export default class Sacks extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['sacks', 'sack', 'sax'],
      description: "Returns a player's Skyblock sacks content value",
      example: `sacks %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<Content | string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const entries = selectedProfile.inventory?.sacks_counts ?? {}

    let totalValue = 0
    if (Object.entries(entries).length > 0) {
      const bazaar = await context.app.hypixelApi.getSkyblockBazaar({ raw: true })
      const skyhelperPrices = (await getPrices()) as Record<string, number>

      for (const [name, count] of Object.entries(entries)) {
        if (count === 0) continue
        let price: number

        /*
         * Prioritize official prices.
         * Skyhelper prices are fallback for items that can be not easily fetched.
         */
        if (name in bazaar.products) {
          const product = bazaar.products[name]
          price =
            product.sell_summary.length > 0 ? product.sell_summary[0].pricePerUnit : product.quick_status.sellPrice
        } else if (name in skyhelperPrices) {
          price = skyhelperPrices[name]
        } else {
          continue
        }

        totalValue += count * price
      }
    }

    return context.app.i18n.t(($) => $['commands.sacks.response'], {
      username: givenUsername,
      value: shortenNumber(totalValue)
    })
  }
}
