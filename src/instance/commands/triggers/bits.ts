/*
 CREDIT: Implemented by Callan
 Discord: callanftw
 Minecraft username: Callanplays
*/
import DefaultAxios from 'axios'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { shortenNumber } from '../../../utility/shared-utility.js'

/* eslint-disable @typescript-eslint/naming-convention */
const BitItem: Record<string, { bitValue: number; prettyName: string }> = {
  GOD_POTION_2: { bitValue: 1500, prettyName: 'Godpot' },
  KISMET_FEATHER: { bitValue: 1350, prettyName: 'Kismet' },
  KAT_FLOWER: { bitValue: 500, prettyName: 'Kat Flower' },
  KAT_BOUQUET: { bitValue: 2500, prettyName: 'Kat Bouquet' },
  MATRIARCH_PARFUM: { bitValue: 1200, prettyName: 'Matriarch Perfume' },
  HOLOGRAM: { bitValue: 2000, prettyName: 'Hologram' },
  DITTO_BLOB: { bitValue: 600, prettyName: 'Ditto Blob' },
  BUILDERS_WAND: { bitValue: 12_000, prettyName: 'Builder Wand' },
  BLOCK_ZAPPER: { bitValue: 5000, prettyName: 'Block Zapper' },
  BITS_TALISMAN: { bitValue: 15_000, prettyName: 'Bits Tali' },
  PORTALIZER: { bitValue: 4800, prettyName: 'Portalizer' },
  AUTOPET_RULES_2: { bitValue: 21_000, prettyName: 'Autopet' },
  INFERNO_FUEL_BLOCK: { bitValue: 75, prettyName: 'Inferno Block' },
  SHARD_BITBUG: { bitValue: 5000, prettyName: 'Bitbugs' },
  HEAT_CORE: { bitValue: 3000, prettyName: 'Heat Core' },
  HYPER_CATALYST_UPGRADE: { bitValue: 300, prettyName: 'Hyper Cat' },
  ULTIMATE_CARROT_CANDY_UPGRADE: { bitValue: 8000, prettyName: 'Ult. Carrot Upgrade' },
  COLOSSAL_EXP_BOTTLE_UPGRADE: { bitValue: 1200, prettyName: 'Coloss Exp Upgrade' },
  JUMBO_BACKPACK_UPGRADE: { bitValue: 4000, prettyName: 'Jumbo BP Upgrade' },
  MINION_STORAGE_EXPANDER: { bitValue: 1500, prettyName: 'Minion Storage X-pender' },
  POCKET_SACK_IN_A_SACK: { bitValue: 8000, prettyName: 'Pocket Sack' },
  TRIO_CONTACTS_ADDON: { bitValue: 6450, prettyName: 'Abi Contacts' },
  ABICASE_SUMSUNG_1: { bitValue: 15_000, prettyName: 'Sumsung© G3 Case' },
  ABICASE_SUMSUNG_2: { bitValue: 25_000, prettyName: 'Sumsung© GG Case' },
  ABICASE_REZAR: { bitValue: 26_000, prettyName: 'Rezar® Case' },
  ABICASE_BLUE_RED: { bitValue: 17_000, prettyName: 'Blue™ but Red Case' },
  ABICASE_BLUE_BLUE: { bitValue: 17_000, prettyName: 'Actually Blue™ Case' },
  ABICASE_BLUE_GREEN: { bitValue: 17_000, prettyName: 'Blue™ but Green Case' },
  ABICASE_BLUE_YELLOW: { bitValue: 17_000, prettyName: 'Blue™ but Yellow Case' },
  ABICASE_BLUE_AQUA: { bitValue: 17_000, prettyName: 'Lighter Blue™ Case' },
  DYE_PURE_WHITE: { bitValue: 250_000, prettyName: 'White Dye' },
  DYE_PURE_BLACK: { bitValue: 250_000, prettyName: 'Black Dye' },
  ENCHANTMENT_EXPERTISE_1: { bitValue: 4000, prettyName: 'Expertise' },
  ENCHANTMENT_COMPACT_1: { bitValue: 4000, prettyName: 'Compact Ench' },
  ENCHANTMENT_CULTIVATING_1: { bitValue: 4000, prettyName: 'Cult Ench' },
  ENCHANTMENT_CHAMPION_1: { bitValue: 4000, prettyName: 'Champ Ench' },
  ENCHANTMENT_ABSORB_1: { bitValue: 4000, prettyName: 'Absorb Ench' },
  ENCHANTMENT_TOXOPHILITE_1: { bitValue: 4000, prettyName: 'Toxo Ench' },
  ENCHANTMENT_HECATOMB_1: { bitValue: 6000, prettyName: 'Hecatomb Ench' },
  TALISMAN_ENRICHMENT_WALK_SPEED: { bitValue: 5000, prettyName: 'Spd Enrich' },
  TALISMAN_ENRICHMENT_INTELLIGENCE: { bitValue: 5000, prettyName: 'Int Enrich' },
  TALISMAN_ENRICHMENT_CRITICAL_DAMAGE: { bitValue: 5000, prettyName: 'Crit Dmg Enrich' },
  TALISMAN_ENRICHMENT_CRITICAL_CHANCE: { bitValue: 5000, prettyName: 'Crit Chance Enrich' },
  TALISMAN_ENRICHMENT_STRENGTH: { bitValue: 5000, prettyName: 'Str Enrich' },
  TALISMAN_ENRICHMENT_DEFENSE: { bitValue: 5000, prettyName: 'Def Enrich' },
  TALISMAN_ENRICHMENT_HEALTH: { bitValue: 5000, prettyName: 'Health Enrich' },
  TALISMAN_ENRICHMENT_MAGIC_FIND: { bitValue: 5000, prettyName: 'MF Enrich' },
  TALISMAN_ENRICHMENT_FEROCITY: { bitValue: 5000, prettyName: 'Fero Enrich' },
  TALISMAN_ENRICHMENT_SEA_CREATURE_CHANCE: { bitValue: 5000, prettyName: 'SC Chance Enrich' },
  TALISMAN_ENRICHMENT_ATTACK_SPEED: { bitValue: 5000, prettyName: 'Atk Spd Enrich' },
  TALISMAN_ENRICHMENT_SWAPPER: { bitValue: 200, prettyName: 'Acc Enrich Swapper' }
}
/* eslint-enable @typescript-eslint/naming-convention */

export default class Bits extends ChatCommandHandler {
  private static readonly EntriesPerPage = 5
  private static readonly UpdatePriceEvery = 5 * 60 * 1000 // 5 minute
  private lastPricesUpdateAt = 0
  private prices: { itemId: string; sellPrice: number }[] = []

  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'bits',
      triggers: ['bits', 'bit'],
      description: 'Returns the best bit items to purchase for the most profit.',
      example: `bits [page]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenPage = context.args.at(0)
    const page = givenPage === undefined ? 1 : /^\d+$/.test(givenPage) ? Number(givenPage) : Number.NaN
    if (!Number.isSafeInteger(page) || page <= 0) return `${context.username}, invalid page.`

    const currentTime = Date.now()
    if (this.lastPricesUpdateAt + Bits.UpdatePriceEvery < currentTime) {
      try {
        await this.updatePrices()
      } catch {
        return `${context.username}, cannot update prices.`
      }
      this.lastPricesUpdateAt = currentTime
    }

    if (this.prices.length === 0) return `${context.username}, no bit item prices are available.`

    const totalPages = Math.ceil(this.prices.length / Bits.EntriesPerPage)
    if (page > totalPages) return `${context.username}, can only go up to page ${totalPages}`

    const pagePrices = this.prices.slice(Bits.EntriesPerPage * (page - 1), Bits.EntriesPerPage * page)
    const response = [`${context.username} (page ${page}/${totalPages}):`]
    for (const [index, { itemId, sellPrice }] of pagePrices.entries()) {
      const itemDetails = BitItem[itemId]
      const rank = index + 1 + Bits.EntriesPerPage * (page - 1)
      const coinsPerBit = shortenNumber(Math.floor(sellPrice / itemDetails.bitValue))
      response.push(`${rank}. ${itemDetails.prettyName} (${coinsPerBit} coins/bit)`)
    }
    return response.join('\n')
  }

  private async updatePrices(): Promise<void> {
    const [auctionResult, bazaarResult] = await Promise.allSettled([
      DefaultAxios.get<Record<string, number>>(`https://api.eliteskyblock.com/resources/auctions/neu`).then(
        (response) => response.data
      ),
      DefaultAxios.get<{ products: Record<string, { sellOrder: number }> }>(
        `https://api.eliteskyblock.com/resources/bazaar`
      ).then((response) => response.data)
    ])

    if (auctionResult.status === 'rejected' && bazaarResult.status === 'rejected') {
      throw new Error('Cannot update auction or bazaar prices.')
    }

    const pricesByItemId = new Map<string, number>()
    if (auctionResult.status === 'fulfilled') {
      for (const [itemId, sellPrice] of Object.entries(auctionResult.value)) {
        if (Object.hasOwn(BitItem, itemId)) pricesByItemId.set(itemId, sellPrice)
      }
    }
    if (bazaarResult.status === 'fulfilled') {
      for (const [itemId, { sellOrder }] of Object.entries(bazaarResult.value.products)) {
        const sellPrice = sellOrder
        if (!Object.hasOwn(BitItem, itemId) || sellPrice <= (pricesByItemId.get(itemId) ?? 0)) continue
        pricesByItemId.set(itemId, sellPrice)
      }
    }

    this.prices = Array.from(pricesByItemId, ([itemId, sellPrice]) => ({ itemId, sellPrice })).toSorted(
      (a, b) => b.sellPrice / BitItem[b.itemId].bitValue - a.sellPrice / BitItem[a.itemId].bitValue
    )
  }
}
