import DefaultAxios from 'axios'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { Hypixel } from '../../../core/hypixel/hypixel.js'
import Duration from '../../../utility/duration.js'
import { shortenNumber } from '../../../utility/shared-utility.js'

/* eslint-disable @typescript-eslint/naming-convention */
const CopperItem: Record<string, { copperValue: number; prettyName: string }> = {
  GARDEN_SCYTHE: { copperValue: 20, prettyName: 'Garden Scythe' },
  BASIC_GARDENING_HOE: { copperValue: 5, prettyName: 'Basic Gardening Hoe' },
  ADVANCED_GARDENING_HOE: { copperValue: 25, prettyName: 'Adv Gardening Hoe' },
  BASIC_GARDENING_AXE: { copperValue: 5, prettyName: 'Basic Gardening Axe' },
  ADVANCED_GARDENING_AXE: { copperValue: 25, prettyName: 'Adv Gardening Axe' },
  BUILDERS_RULER: { copperValue: 20, prettyName: "Builder's Ruler" },
  ENCHANTMENT_DEDICATION: { copperValue: 250, prettyName: 'Dedication' },
  ENCHANTMENT_GREEN_THUMB: { copperValue: 1500, prettyName: 'Green Thumb' },
  LOTUS_BRACELET: { copperValue: 50, prettyName: 'Peony Bracelet' },
  LOTUS_BELT: { copperValue: 100, prettyName: 'Peony Belt' },
  LOTUS_NECKLACE: { copperValue: 200, prettyName: 'Peony Necklace' },
  LOTUS_CLOAK: { copperValue: 500, prettyName: 'Peony Cloak' },
  YELLOW_BANDANA: { copperValue: 300, prettyName: 'Yellow Bandana' },
  SKYMART_BROCHURE: { copperValue: 100, prettyName: 'SkyMart Brochure' },
  LARGE_WALNUT: { copperValue: 150, prettyName: 'Large Walnut' },
  BLOSSOM_BRACELET: { copperValue: 2550, prettyName: 'Blossom Bracelet' },
  BLOSSOM_BELT: { copperValue: 5100, prettyName: 'Blossom Belt' },
  BLOSSOM_NECKLACE: { copperValue: 7700, prettyName: 'Blossom Necklace' },
  BLOSSOM_CLOAK: { copperValue: 10_500, prettyName: 'Blossom Cloak' },
  COPPER_TALISMAN: { copperValue: 5000, prettyName: 'Copper Talisman' },
  COPPER_RING: { copperValue: 25_000, prettyName: 'Copper Ring' },
  COPPER_ARTIFACT: { copperValue: 75_000, prettyName: 'Copper Artifact' },
  SOWLEDGE_GARDEN_CHIP: { copperValue: 200, prettyName: 'Sowledge Chip' },
  CROPSHOT_GARDEN_CHIP: { copperValue: 500, prettyName: 'Cropshot Chip' },
  HYDRO_CAN_TURBO_2000: { copperValue: 200, prettyName: 'HydroCan 2000' },
  HYDRO_CAN_ULTRA_3000: { copperValue: 700, prettyName: 'HydroCan 3000' },
  AQUAMASTER_X: { copperValue: 1700, prettyName: 'AquaMaster X' },
  AQUAMASTER_HYDROMAX: { copperValue: 4200, prettyName: 'AquaMaster Hydromax' },
  PLANT_DIAGNOSTICS_TOOL: { copperValue: 50, prettyName: 'Diagnostics Tool' },
  FARMING_TOOLKIT: { copperValue: 500, prettyName: 'Farming Toolkit' },
  ORCHARD_GREENHOUSE_SKIN: { copperValue: 3000, prettyName: 'Orchard Skin' },
  BOTANICAL_GREENHOUSE_SKIN: { copperValue: 5000, prettyName: 'Botanical Skin' },
  SKYMART_VACUUM: { copperValue: 100, prettyName: 'Vacuum' },
  SKYMART_TURBO_VACUUM: { copperValue: 300, prettyName: 'Turbo Vacuum' },
  SKYMART_HYPER_VACUUM: { copperValue: 800, prettyName: 'Hyper Vacuum' },
  INFINI_VACUUM: { copperValue: 1800, prettyName: 'InfiniVacuum' },
  INFINI_VACUUM_HOOVERIUS: { copperValue: 4300, prettyName: 'InfiniVacuum Hooverius' },
  SPRAYONATOR: { copperValue: 25, prettyName: 'Sprayonator' },
  PEST_REPELLENT: { copperValue: 15, prettyName: 'Pest Repellent' },
  PEST_REPELLENT_MAX: { copperValue: 40, prettyName: 'Pest Repellent MAX' }
}
/* eslint-enable @typescript-eslint/naming-convention */

export default class Copper extends ChatCommandHandler {
  private static readonly AuctionUrl = 'https://api.eliteskyblock.com/resources/auctions/neu'
  private static readonly EntriesPerPage = 5
  private static readonly PriceCacheDuration = Duration.minutes(5).toMilliseconds()
  private lastPricesUpdateAt = 0
  private prices: { itemId: string; sellPrice: number }[] = []

  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'copper',
      triggers: ['copper'],
      description: 'Returns the best copper items to purchase for the most profit.',
      example: `copper [page]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenPage = context.args.at(0)
    const page = givenPage === undefined ? 1 : /^\d+$/.test(givenPage) ? Number(givenPage) : Number.NaN
    if (!Number.isSafeInteger(page) || page <= 0) return `${context.username}, invalid page.`

    const currentTime = Date.now()
    if (this.lastPricesUpdateAt + Copper.PriceCacheDuration < currentTime) {
      try {
        await this.updatePrices(context.app.core.hypixelApi)
      } catch {
        return `${context.username}, cannot update prices.`
      }
      this.lastPricesUpdateAt = currentTime
    }

    if (this.prices.length === 0) return `${context.username}, no copper item prices are available.`

    const totalPages = Math.ceil(this.prices.length / Copper.EntriesPerPage)
    if (page > totalPages) return `${context.username}, can only go up to page ${totalPages}`

    const pagePrices = this.prices.slice(Copper.EntriesPerPage * (page - 1), Copper.EntriesPerPage * page)
    const response = [`${context.username} (page ${page}/${totalPages}):`]
    for (const [index, { itemId, sellPrice }] of pagePrices.entries()) {
      const itemDetails = CopperItem[itemId]
      const rank = index + 1 + Copper.EntriesPerPage * (page - 1)
      const coinsPerCopper = shortenNumber(Math.floor(sellPrice / itemDetails.copperValue))
      response.push(`${rank}. ${itemDetails.prettyName} (${coinsPerCopper} coins/copper)`)
    }
    return response.join('\n')
  }

  private async updatePrices(hypixelApi: Hypixel): Promise<void> {
    const [auctionResult, bazaarProducts] = await Promise.all([
      DefaultAxios.get<Record<string, number>>(Copper.AuctionUrl).then((response) => response.data),
      hypixelApi.getSkyblockBazaar(Date.now())
    ])

    this.prices = Object.keys(CopperItem)
      .map((itemId) => {
        const auctionPrice = Object.hasOwn(auctionResult, itemId) ? auctionResult[itemId] : 0
        const bazaarPrice = Object.hasOwn(bazaarProducts, itemId) ? bazaarProducts[itemId].quick_status.buyPrice : 0
        return { itemId, sellPrice: Math.max(auctionPrice, bazaarPrice) }
      })
      .filter(({ sellPrice }) => sellPrice > 0)
      .toSorted(
        (a, b) => b.sellPrice / CopperItem[b.itemId].copperValue - a.sellPrice / CopperItem[a.itemId].copperValue
      )
  }
}
