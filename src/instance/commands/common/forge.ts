import type { SkyblockV2Member } from 'hypixel-api-reborn'

interface ForgeProcess {
  id: string
  slot: number
  startTime: number
}

type ForgeProfile = SkyblockV2Member & {
  forge?: {
    forge_processes?: {
      forge_1?: Record<string, ForgeProcess>
    }
  }
}

export interface ForgeItemSummary {
  id: string
  name: string
  slot: number
  timeStarted: number
  timeFinished: number
  timeFinishedText: string
}

const ForgeItems: Record<string, { name: string; duration: number }> = {
  REFINED_DIAMOND: { name: 'Refined Diamond', duration: 28_800_000 },
  REFINED_MITHRIL: { name: 'Refined Mithril', duration: 21_600_000 },
  REFINED_TITANIUM: { name: 'Refined Titanium', duration: 43_200_000 },
  REFINED_TUNGSTEN: { name: 'Refined Tungsten', duration: 3_600_000 },
  REFINED_UMBER: { name: 'Refined Umber', duration: 3_600_000 },
  MITHRIL_NECKLACE: { name: 'Mithril Necklace', duration: 3_600_000 },
  MITHRIL_CLOAK: { name: 'Mithril Cloak', duration: 3_600_000 },
  MITHRIL_BELT: { name: 'Mithril Belt', duration: 3_600_000 },
  MITHRIL_GAUNTLET: { name: 'Mithril Gauntlet', duration: 3_600_000 },
  TITANIUM_NECKLACE: { name: 'Titanium Necklace', duration: 16_200_000 },
  TITANIUM_CLOAK: { name: 'Titanium Cloak', duration: 16_200_000 },
  TITANIUM_BELT: { name: 'Titanium Belt', duration: 16_200_000 },
  TITANIUM_GAUNTLET: { name: 'Titanium Gauntlet', duration: 16_200_000 },
  TITANIUM_TALISMAN: { name: 'Titanium Talisman', duration: 50_400_000 },
  TITANIUM_RING: { name: 'Titanium Ring', duration: 72_000_000 },
  TITANIUM_ARTIFACT: { name: 'Titanium Artifact', duration: 129_600_000 },
  TITANIUM_RELIC: { name: 'Titanium Relic', duration: 259_200_000 },
  DIVAN_POWDER_COATING: { name: 'Divan Powder Coating', duration: 129_600_000 },
  DIVAN_HELMET: { name: 'Helmet Of Divan', duration: 86_400_000 },
  DIVAN_CHESTPLATE: { name: 'Chestplate Of Divan', duration: 86_400_000 },
  DIVAN_LEGGINGS: { name: 'Leggings Of Divan', duration: 86_400_000 },
  DIVAN_BOOTS: { name: 'Boots Of Divan', duration: 86_400_000 },
  AMBER_NECKLACE: { name: 'Amber Necklace', duration: 86_400_000 },
  SAPPHIRE_CLOAK: { name: 'Sapphire Cloak', duration: 86_400_000 },
  JADE_BELT: { name: 'Jade Belt', duration: 86_400_000 },
  AMETHYST_GAUNTLET: { name: 'Amethyst Gauntlet', duration: 86_400_000 },
  GEMSTONE_CHAMBER: { name: 'Gemstone Chamber', duration: 14_400_000 },
  DWARVEN_HANDWARMERS: { name: 'Dwarven Handwarmers', duration: 14_400_000 },
  DWARVEN_METAL: { name: 'Dwarven Metal Talisman', duration: 86_400_000 },
  DIVAN_PENDANT: { name: 'Pendant of Divan', duration: 604_800_000 },
  POWER_RELIC: { name: 'Relic of Power', duration: 28_800_000 },
  PERFECT_AMBER_GEM: { name: 'Perfect Amber Gemstone', duration: 72_000_000 },
  PERFECT_AMETHYST_GEM: { name: 'Perfect Amethyst Gemstone', duration: 72_000_000 },
  PERFECT_JADE_GEM: { name: 'Perfect Jade Gemstone', duration: 72_000_000 },
  PERFECT_JASPER_GEM: { name: 'Perfect Jasper Gemstone', duration: 72_000_000 },
  PERFECT_OPAL_GEM: { name: 'Perfect Opal Gemstone', duration: 72_000_000 },
  PERFECT_RUBY_GEM: { name: 'Perfect Ruby Gemstone', duration: 72_000_000 },
  PERFECT_SAPPHIRE_GEM: { name: 'Perfect Sapphire Gemstone', duration: 72_000_000 },
  PERFECT_TOPAZ_GEM: { name: 'Perfect Topaz Gemstone', duration: 72_000_000 },
  PERFECT_AQUAMARINE_GEM: { name: 'Perfect Aquamarine Gem', duration: 72_000_000 },
  PERFECT_CITRINE_GEM: { name: 'Perfect Citrine Gem', duration: 72_000_000 },
  PERFECT_ONYX_GEM: { name: 'Perfect Onyx Gem', duration: 72_000_000 },
  PERFECT_PERIDOT_GEM: { name: 'Perfect Peridot Gem', duration: 72_000_000 },
  BEJEWELED_HANDLE: { name: 'Bejeweled Handle', duration: 30_000 },
  DRILL_ENGINE: { name: 'Drill Motor', duration: 108_000_000 },
  FUEL_TANK: { name: 'Fuel Canister', duration: 36_000_000 },
  GEMSTONE_MIXTURE: { name: 'Gemstone Mixture', duration: 14_400_000 },
  GLACITE_AMALGAMATION: { name: 'Glacite Amalgamation', duration: 14_400_000 },
  GOLDEN_PLATE: { name: 'Golden Plate', duration: 21_600_000 },
  MITHRIL_PLATE: { name: 'Mithril Plate', duration: 64_800_000 },
  TUNGSTEN_PLATE: { name: 'Tungsten Plate', duration: 10_800_000 },
  UMBER_PLATE: { name: 'Umber Plate', duration: 10_800_000 },
  PERFECT_PLATE: { name: 'Perfect Plate', duration: 1_800_000 },
  DIAMONITE: { name: 'Diamonite', duration: 21_600_000 },
  POCKET_ICEBERG: { name: 'Pocket Iceberg', duration: 21_600_000 },
  PETRIFIED_STARFALL: { name: 'Petrified Starfall', duration: 21_600_000 },
  PURE_MITHRIL: { name: 'Pure Mithril', duration: 21_600_000 },
  ROCK_GEMSTONE: { name: 'Dwarven Geode', duration: 21_600_000 },
  TITANIUM_TESSERACT: { name: 'Titanium Tesseract', duration: 21_600_000 },
  GLEAMING_CRYSTAL: { name: 'Gleaming Crystal', duration: 21_600_000 },
  HOT_STUFF: { name: 'Scorched Topaz', duration: 21_600_000 },
  AMBER_MATERIAL: { name: 'Amber Material', duration: 21_600_000 },
  FRIGID_HUSK: { name: 'Frigid Husk', duration: 21_600_000 },
  BEJEWELED_COLLAR: { name: 'Bejeweled Collar', duration: 7_200_000 },
  MOLE: { name: '[Lvl 1] Mole', duration: 259_200_000 },
  AMMONITE: { name: '[Lvl 1] Ammonite', duration: 259_200_000 },
  PENGUIN: { name: '[Lvl 1] Penguin', duration: 604_800_000 },
  TYRANNOSAURUS: { name: '[Lvl 1] T-Rex', duration: 604_800_000 },
  SPINOSAURUS: { name: '[Lvl 1] Spinosaurus', duration: 604_800_000 },
  GOBLIN: { name: '[Lvl 1] Goblin', duration: 604_800_000 },
  ANKYLOSAURUS: { name: '[Lvl 1] Ankylosaurus', duration: 604_800_000 },
  MAMMOTH: { name: '[Lvl 1] Mammoth', duration: 604_800_000 },
  MITHRIL_DRILL_1: { name: 'Mithril Drill SX-R226', duration: 14_400_000 },
  MITHRIL_DRILL_2: { name: 'Mithril Drill SX-R326', duration: 30_000 },
  GEMSTONE_DRILL_1: { name: 'Ruby Drill TX-15', duration: 14_400_000 },
  GEMSTONE_DRILL_2: { name: 'Gemstone Drill LT-522', duration: 30_000 },
  GEMSTONE_DRILL_3: { name: 'Topaz Drill KGR-12', duration: 30_000 },
  GEMSTONE_DRILL_4: { name: 'Jasper Drill X', duration: 30_000 },
  POLISHED_TOPAZ_ROD: { name: 'Polished Topaz Rod', duration: 43_200_000 },
  TITANIUM_DRILL_1: { name: 'Titanium Drill DR-X355', duration: 14_400_000 },
  TITANIUM_DRILL_2: { name: 'Titanium Drill DR-X455', duration: 30_000 },
  TITANIUM_DRILL_3: { name: 'Titanium Drill DR-X555', duration: 30_000 },
  TITANIUM_DRILL_4: { name: 'Titanium Drill DR-X655', duration: 30_000 },
  CHISEL: { name: 'Chisel', duration: 14_400_000 },
  REINFORCED_CHISEL: { name: 'Reinforced Chisel', duration: 30_000 },
  GLACITE_CHISEL: { name: 'Glacite-Plated Chisel', duration: 30_000 },
  PERFECT_CHISEL: { name: 'Perfect Chisel', duration: 30_000 },
  DIVAN_DRILL: { name: "Divan's Drill", duration: 30_000 },
  STARFALL_SEASONING: { name: 'Starfall Seasoning', duration: 64_800_000 },
  GOBLIN_OMELETTE: { name: 'Goblin Omelette', duration: 64_800_000 },
  GOBLIN_OMELETTE_BLUE_CHEESE: { name: 'Blue Cheese Goblin Omelette', duration: 64_800_000 },
  GOBLIN_OMELETTE_PESTO: { name: 'Pesto Goblin Omelette', duration: 64_800_000 },
  GOBLIN_OMELETTE_SPICY: { name: 'Spicy Goblin Omelette', duration: 64_800_000 },
  GOBLIN_OMELETTE_SUNNY_SIDE: { name: 'Sunny Side Goblin Omelette', duration: 64_800_000 },
  TUNGSTEN_KEYCHAIN: { name: 'Tungsten Regulator', duration: 64_800_000 },
  MITHRIL_DRILL_ENGINE: { name: 'Mithril-Plated Drill Engine', duration: 86_400_000 },
  TITANIUM_DRILL_ENGINE: { name: 'Titanium-Plated Drill Engine', duration: 30_000 },
  RUBY_POLISHED_DRILL_ENGINE: { name: 'Ruby-polished Drill Engine', duration: 30_000 },
  SAPPHIRE_POLISHED_DRILL_ENGINE: { name: 'Sapphire-polished Drill Engine', duration: 30_000 },
  AMBER_POLISHED_DRILL_ENGINE: { name: 'Amber-polished Drill Engine', duration: 30_000 },
  MITHRIL_FUEL_TANK: { name: 'Mithril-Infused Fuel Tank', duration: 86_400_000 },
  TITANIUM_FUEL_TANK: { name: 'Titanium-Infused Fuel Tank', duration: 30_000 },
  GEMSTONE_FUEL_TANK: { name: 'Gemstone Fuel Tank', duration: 30_000 },
  PERFECTLY_CUT_FUEL_TANK: { name: 'Perfectly-Cut Fuel Tank', duration: 30_000 },
  BEACON_2: { name: 'Beacon II', duration: 72_000_000 },
  BEACON_3: { name: 'Beacon III', duration: 108_000_000 },
  BEACON_4: { name: 'Beacon IV', duration: 144_000_000 },
  BEACON_5: { name: 'Beacon V', duration: 180_000_000 },
  FORGE_TRAVEL_SCROLL: { name: 'Travel Scroll to the Dwarven Forge', duration: 18_000_000 },
  BASE_CAMP_TRAVEL_SCROLL: { name: 'Travel Scroll to the Dwarven Base Camp', duration: 36_000_000 },
  POWER_CRYSTAL: { name: 'Power Crystal', duration: 7_200_000 },
  SECRET_RAILROAD_PASS: { name: 'Secret Railroad Pass', duration: 30_000 },
  TUNGSTEN_KEY: { name: 'Tungsten Key', duration: 1_800_000 },
  UMBER_KEY: { name: 'Umber Key', duration: 1_800_000 },
  SKELETON_KEY: { name: 'Skeleton Key', duration: 1_800_000 },
  PORTABLE_CAMPFIRE: { name: 'Portable Campfire', duration: 1_800_000 }
}

const QuickForgeMultiplier: Record<number, number> = {
  1: 0.895,
  2: 0.89,
  3: 0.885,
  4: 0.88,
  5: 0.875,
  6: 0.87,
  7: 0.865,
  8: 0.86,
  9: 0.855,
  10: 0.85,
  11: 0.845,
  12: 0.84,
  13: 0.835,
  14: 0.83,
  15: 0.825,
  16: 0.82,
  17: 0.815,
  18: 0.81,
  19: 0.805,
  20: 0.7
}

export function getForgeItems(profile: SkyblockV2Member): ForgeItemSummary[] | null {
  const forgeData = (profile as ForgeProfile).forge?.forge_processes?.forge_1
  if (!forgeData) return null

  const processes = Object.values(forgeData)
  if (processes.length === 0) return []

  const quickForge = (profile as ForgeProfile).mining_core?.nodes?.forge_time
  const multiplier = quickForge ? (QuickForgeMultiplier[quickForge] ?? 1) : 1

  return processes.map((process) => {
    const known = ForgeItems[process.id]
    const duration = known ? known.duration * multiplier : 0
    const timeFinished = process.startTime + duration

    return {
      id: process.id,
      name: known ? known.name : 'Unknown Item',
      slot: process.slot,
      timeStarted: process.startTime,
      timeFinished: timeFinished,
      timeFinishedText: duration > 0 ? formatForgeTimeRemaining(timeFinished) : ''
    }
  })
}

function formatForgeTimeRemaining(timeFinished: number): string {
  if (timeFinished <= Date.now()) return '(FINISHED)'

  const diff = timeFinished - Date.now()
  const totalMinutes = Math.max(1, Math.floor(diff / 60_000))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`)

  return ` (${parts.join(' ')})`
}
