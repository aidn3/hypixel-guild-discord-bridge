/*
 CREDIT: Implemented by Callan
 Discord: callanftw
 Minecraft username: Callanplays
*/
import type { AxiosResponse } from 'axios'
import Axios from 'axios'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

/* eslint-disable @typescript-eslint/naming-convention */
const BitItem: Record<string, { bitValue: number; prettyName: string }> = {
  GOD_POTION_2: { bitValue: 1500, prettyName: 'Godpot' },
  KISMET_FEATHER: { bitValue: 1350, prettyName: 'Kismet' },
  KAT_FLOWER: { bitValue: 500, prettyName: 'Kat Flower' },
  KAT_BOUQUET: { bitValue: 2500, prettyName: 'Kat Bouquet' },
  MATRIARCH_PARFUM: { bitValue: 1200, prettyName: 'Matriarch Perfume' },
  HOLOGRAM: { bitValue: 2000, prettyName: 'Hologram' },
  BUILDERS_WAND: { bitValue: 12_000, prettyName: 'Builder Wand' },
  BLOCK_ZAPPER: { bitValue: 5000, prettyName: 'Block Zapper' },
  BITS_TALISMAN: { bitValue: 15_000, prettyName: 'Bits Tali' },
  PORTALIZER: { bitValue: 4800, prettyName: 'Portalizer' },
  AUTOPET_RULES_2: { bitValue: 21_000, prettyName: 'Autopet' },
  INFERNO_FUEL_BLOCK: { bitValue: 75, prettyName: 'Inferno Block' },
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
  private static readonly UpdatePriceEvery = 5 * 60 * 1000 // 5 minute
  private lastPricesUpdateAt = 0
  private prices: { itemId: string; sellPrice: number }[] = []

  constructor() {
    super({
      triggers: ['bits', 'bit'],
      description: 'Returns the best bit items to purchase for the most profit.',
      example: `bits`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const currentTime = Date.now()
    if (this.lastPricesUpdateAt + Bits.UpdatePriceEvery < currentTime) {
      try {
        await this.updatePrices()
      } catch {
        return `${context.username}, cannot update prices.`
      }
      this.lastPricesUpdateAt = currentTime
    }

    let response = `${context.username}:\n`
    let index = 0
    for (const { itemId, sellPrice } of this.prices) {
      const itemDetails = BitItem[itemId]
      response += `${++index}. ${itemDetails.prettyName} (${Math.floor(sellPrice / itemDetails.bitValue)})\n`
    }
    return response
  }

  private async updatePrices(): Promise<void> {
    const response = await Axios.get(`https://moulberry.codes/lowestbin.json`).then(
      (response: AxiosResponse<Record<string, number>, unknown>) => response.data
    )

    this.prices = Object.entries(response)
      .filter(([itemId]) => Object.hasOwn(BitItem, itemId))
      .map(([itemId, sellPrice]) => ({ itemId, sellPrice }))
      .sort((a, b) => b.sellPrice / BitItem[b.itemId].bitValue - a.sellPrice / BitItem[a.itemId].bitValue)
      .slice(0, 5)
  }
}
