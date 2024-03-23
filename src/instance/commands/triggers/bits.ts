/*
 CREDIT: Implemented by Callan
 Discord: callanftw
 Minecraft username: Callanplays
*/
import { sleep } from '../../../util/shared-util';
import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'
import { fetchBitItemPrice } from '../common/util'

const BitItem: Record<string, { bitValue: number; prettyName: string }> = {
  GOD_POTION_2: { bitValue: 1500, prettyName: 'Godpot (1.5k Bits)'},
  KISMET_FEATHER: { bitValue: 1350, prettyName: 'Kismet (1.35k Bits)'},
  KAT_FLOWER: { bitValue: 500, prettyName: 'Kat Flower (500 Bits)'},
  KAT_BOUQUET: { bitValue: 2500, prettyName: 'Kat Bouquet (2.5k Bits)'},
  MATRIARCH_PARFUM: { bitValue: 1200, prettyName: 'Matriarch Perfume (1.2k Bits)'},
  HOLOGRAM: { bitValue: 2000, prettyName: 'Hologram (2k Bits)'},
  BUILDERS_WAND: { bitValue: 12_000, prettyName: 'Builder Wand (12k Bits)'},
  BLOCK_ZAPPER: { bitValue: 5000, prettyName: 'Block Zapper (5k Bits)'},
  BITS_TALISMAN: { bitValue: 15_000, prettyName: 'Bits Tali (15k Bits)'},
  PORTALIZER: { bitValue: 4800, prettyName: 'Portalizer (4.8k Bits)'},
  AUTOPET_RULES_2: { bitValue: 21_000, prettyName: 'Autopet (21k Bits)'},
  INFERNO_FUEL_BLOCK: { bitValue: 75, prettyName: 'Inferno Block (75 Bits)'},
  HEAT_CORE: { bitValue: 3000, prettyName: 'Heat Core (3k Bits)'},
  HYPER_CATALYST_UPGRADE: { bitValue: 300, prettyName: 'Hyper Cat (300 Bits)'},
  ULTIMATE_CARROT_CANDY_UPGRADE: { bitValue: 8000, prettyName: 'Ult. Carrot Upgrade (8k Bits)'},
  COLOSSAL_EXP_BOTTLE_UPGRADE: { bitValue: 1200, prettyName: 'Coloss Exp Upgrade (1.2k Bits)'},
  JUMBO_BACKPACK_UPGRADE: { bitValue: 4000, prettyName: 'Jumbo Backpack Upgrade (4k Bits)'},
  MINION_STORAGE_EXPANDER: { bitValue: 1500, prettyName: 'Minion Storage Expander (1.5k Bits)'},
  POCKET_SACK_IN_A_SACK: { bitValue: 8000, prettyName: 'Pocket Sack (8k Bits)'},
  TRIO_CONTACTS_ADDON: { bitValue: 6450, prettyName: 'Abi Contacts (6.45k Bits)'},
  ABICASE_SUMSUNG_1: { bitValue: 15_000, prettyName: 'Sumsung© G3 Case (15k Bits)'},
  ABICASE_SUMSUNG_2: { bitValue: 25_000, prettyName: 'Sumsung© GG Case (25k Bits)'},
  ABICASE_REZAR: { bitValue: 26_000, prettyName: 'Rezar® Case (26k Bits)'},
  ABICASE_BLUE_RED: { bitValue: 17_000, prettyName: 'Blue™ but Red Case (17k Bits)'},
  ABICASE_BLUE_BLUE: { bitValue: 17_000, prettyName: 'Actually Blue™ Case (17k Bits)'},
  ABICASE_BLUE_GREEN: { bitValue: 17_000, prettyName: 'Blue™ but Green Case (17k Bits)'},
  ABICASE_BLUE_YELLOW: { bitValue: 17_000, prettyName: 'Blue™ but Yellow Case (17k Bits)'},
  ABICASE_BLUE_AQUA: { bitValue: 17_000, prettyName: 'Lighter Blue™ Case (17k Bits)'},
  DYE_PURE_WHITE: { bitValue: 250_000, prettyName: 'Pure White Dye (250k Bits)'},
  DYE_PURE_BLACK: { bitValue: 250_000, prettyName: 'Pure Black Dye (250k Bits)'},
  ENCHANTMENT_EXPERTISE_1: { bitValue: 4000, prettyName: 'Expertise (4k Bits)'},
  ENCHANTMENT_COMPACT_1: { bitValue: 4000, prettyName: 'Compact Ench (4k Bits)'},
  ENCHANTMENT_CULTIVATING_1: { bitValue: 4000, prettyName: 'Cult Ench (4k Bits)'},
  ENCHANTMENT_CHAMPION_1: { bitValue: 4000, prettyName: 'Champ Ench (4k Bits)'},
  ENCHANTMENT_HECATOMB_1: { bitValue: 6000, prettyName: 'Hecatomb Ench (6k Bits)'},
  TALISMAN_ENRICHMENT_WALK_SPEED: { bitValue: 5000, prettyName: 'Spd Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_INTELLIGENCE: { bitValue: 5000, prettyName: 'Int Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_CRITICAL_DAMAGE: { bitValue: 5000, prettyName: 'Crit Dmg Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_CRITICAL_CHANCE: { bitValue: 5000, prettyName: 'Crit Chance Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_STRENGTH: { bitValue: 5000, prettyName: 'Str Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_DEFENSE: { bitValue: 5000, prettyName: 'Def Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_HEALTH: { bitValue: 5000, prettyName: 'Health Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_MAGIC_FIND: { bitValue: 5000, prettyName: 'MF Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_FEROCITY: { bitValue: 5000, prettyName: 'Fero Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_SEA_CREATURE_CHANCE: { bitValue: 5000, prettyName: 'SC Chance Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_ATTACK_SPEED: { bitValue: 5000, prettyName: 'Atk Spd Enrich (5k Bits)'},
  TALISMAN_ENRICHMENT_SWAPPER: { bitValue: 200, prettyName: 'Acc Enrich Swapper (200 Bits)'}
}

export default class Bits extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Bits',
      triggers: ['bits'],
      description: 'Returns the best price',
      example: `!bits`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const bitItemPrices = await Promise.all(
      Object.keys(BitItem).map(async (item) => {
        const sellPrice = await fetchBitItemPrice(item)
        await sleep(5);
        if (sellPrice === undefined) return
        const coinsPerBit = sellPrice / BitItem[item].bitValue;
        return { item, coinsPerBit }
      })
    )

    const sortedItems = bitItemPrices
      .filter((item): item is { item: string; coinsPerBit: number } => item !== undefined)
      .sort((a, b) => b.coinsPerBit - a.coinsPerBit)
      .slice(0, 5)

    let response = `${context.username}:\n`
    for (const [index, { item }] of sortedItems.entries()) {
      const prettyName = BitItem[item].prettyName; 
      response += `${index + 1}. ${prettyName}\n`;
    }
    return response
  }
}
