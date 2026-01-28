/* eslint-disable @typescript-eslint/naming-convention */
import type { HypixelSuccessResponse } from './hypixel-api'

export interface SkyblockProfilesResponse extends HypixelSuccessResponse {
  profiles: SkyblockProfile[] | null
}

export interface SkyblockProfile {
  profile_id: string
  members: Record<string, SkyblockMember>
  banking?: { balance: number }
  game_mode?: 'ironman' | 'bingo' | 'island'
  cute_name: string
  selected: boolean
}

export interface SkyblockMember {
  leveling?: { experience: number }
  player_id: string
  currencies?: {
    coin_purse?: number
    motes_purse?: number
    essence?: Record<
      'WITHER' | 'DRAGON' | 'UNDEAD' | 'DIAMOND' | 'SPIDER' | 'GOLD' | 'ICE' | 'CRIMSON',
      { current: number }
    >
  }
  dungeons: SkyblockDungeons | undefined
  rift?: SkyblockRift
  fairy_soul?: { total_collected: number }
  trophy_fish?: Record<string, number> & { last_caught?: string; rewards?: number[] }
  accessory_bag_storage?: {
    selected_power?: string
    highest_magical_power: number
    tuning: { slot_0?: Record<string, number> }
  }
  mining_core?: {
    powder_mithril?: number
    powder_spent_mithril?: number
    powder_gemstone?: number
    powder_spent_gemstone?: number
    powder_glacite?: number
    powder_spent_glacite?: number
    crystals?: {
      jade_crystal: MiningCrystal
      amber_crystal: MiningCrystal
      topaz_crystal: MiningCrystal
      sapphire_crystal: MiningCrystal
      amethyst_crystal: MiningCrystal
    }
  }
  collection?: Record<string, number>
  bestiary?: {
    kills: Record<string, number> & { last_killed_mob: string }
    milestone?: { last_claimed_milestone?: number }
  }
  inventory?: {
    bag_contents?: { talisman_bag: SkyblockInventory }
    inv_armor?: SkyblockInventory
    inv_contents?: SkyblockInventory
    equipment_contents?: SkyblockInventory
    sacks_counts: Record<string, number>
  }
  profile: { bank_account?: number }
  player_stats?: { rift?: { lifetime_motes_earned?: number } }
  player_data: {
    experience?: Record<
      | 'SKILL_FISHING'
      | 'SKILL_ALCHEMY'
      | 'SKILL_RUNECRAFTING'
      | 'SKILL_MINING'
      | 'SKILL_FARMING'
      | 'SKILL_ENCHANTING'
      | 'SKILL_TAMING'
      | 'SKILL_FORAGING'
      | 'SKILL_SOCIAL'
      | 'SKILL_CARPENTRY'
      | 'SKILL_COMBAT',
      number
    >
  }
  nether_island_player_data?: {
    selected_faction?: string
    mages_reputation?: number
    barbarians_reputation?: number

    dojo?: Partial<{
      dojo_points_mob_kb: number
      dojo_points_wall_jump: number
      dojo_points_sword_swap: number
      dojo_points_archer: number
      dojo_points_snake: number
      dojo_points_fireball: number
      dojo_points_lock_head: number
    }>

    kuudra_completed_tiers: {
      none?: number
      hot?: number
      burning?: number
      fiery?: number
      infernal?: number
    }
  }
  slayer: SlayerProfile | undefined
  jacobs_contest?: {
    perks?: {
      farming_level_cap: number
      double_drops: number
    }
    unique_brackets: {
      platinum?: string[]
      diamond?: string[]
      gold?: string[]
      silver?: string[]
      bronze?: string[]
    }
  }
  events?: SkyblockPlayerEvents
  pets_data?: Partial<{ pet_care: { pet_types_sacrificed?: string[] } }>
  essence?: SkyblockEssence
  forge?: SkyblockForge
}

export interface SkyblockInventory {
  type: 0
  data: string
}

export interface SkyblockEssence {
  perks?: SkyblockEssencePerks
}

export interface SkyblockEssencePerks {
  cold_efficiency?: number
  heart_of_gold?: number
  diamond_in_the_rough?: number
  toxophilite?: number
  unbridled_rage?: number
}

export interface SkyblockDungeons {
  dungeon_types: SkyblockDungeonsTypes
  player_classes?: Record<'healer' | 'mage' | 'berserk' | 'archer' | 'tank', SkyblockDungeonsClass | undefined>
  treasures?: { runs?: SkyblockDungeonRun[] }
}

export interface SkyblockDungeonsTypes {
  catacombs: SkyblockDungeonsCatacombs
  master_catacombs: SkyblockDungeonsMasterCatacombs
}

export type DungeonFloors = '1' | '2' | '3' | '4' | '5' | '6' | '7'
export type DungeonFloorsWithEntrance = '0' | DungeonFloors

export interface SkyblockDungeonsCatacombs {
  experience: number
  tier_completions: Record<DungeonFloorsWithEntrance | 'total', number | undefined> | undefined
  fastest_time: Record<DungeonFloorsWithEntrance | 'best', number | undefined> | undefined
  fastest_time_s: Record<DungeonFloors | 'best', number | undefined> | undefined
  fastest_time_s_plus: Record<DungeonFloors | 'best', number | undefined> | undefined
}

export interface SkyblockDungeonsMasterCatacombs {
  tier_completions: Record<DungeonFloors | 'total', number | undefined> | undefined
  fastest_time: Record<DungeonFloors | 'best', number | undefined> | undefined
  fastest_time_s: Record<DungeonFloors | 'best', number | undefined> | undefined
  fastest_time_s_plus: Record<DungeonFloors | 'best', number | undefined> | undefined
}

export interface SkyblockDungeonsClass {
  experience?: number
}

export interface SkyblockDungeonRun {
  completion_ts: number
  dungeon_type: 'catacombs' | 'master_catacombs'
  dungeon_tier: number
  participants: { player_uuid: string; display_name: string }[]
}

export interface SkyblockRift {
  gallery?: { secured_trophies?: RiftSecureTrophies[] }
}

export interface RiftSecureTrophies {
  type: RiftTrophyType
  timestamp: number
}

export type RiftTrophyType =
  | 'wyldly_supreme'
  | 'mirrored'
  | 'chicken_n_egg'
  | 'citizen'
  | 'lazy_living'
  | 'slime'
  | 'vampiric'
  | 'mountain'

export interface SlayerProfile {
  slayer_bosses: {
    zombie: Slayer
    spider: Slayer
    wolf: Slayer
    enderman: Slayer
    blaze: Slayer
    vampire: Slayer
  }
}

export interface Slayer {
  xp: number
  boss_kills_tier_0?: number
  boss_kills_tier_1?: number
  boss_kills_tier_2?: number
  boss_kills_tier_3?: number
  boss_kills_tier_4?: number
}

export interface MiningCrystal {
  total_placed?: number
}

export interface NewsResponse extends HypixelSuccessResponse {
  items: {
    link: string
    text: string
    title: string
  }[]
}

export interface SkyblockPlayerEvents {
  easter?: SkyblockPlayerEaster
}

export interface SkyblockPlayerEaster {
  total_chocolate?: number
  shop?: { chocolate_spent?: number }
  // eggs names and collected amount. not set if not collected.
  // There are other objects inside not related to rabbits, but ignored here since not required YET.
  rabbits: Record<string, number | object>
}

export interface SkyblockForge {
  forge_processes: { forge_1: Record<'1' | '2' | '3' | '4' | '5' | '6' | '7', SkyblockForgeEntry> }
}

export interface SkyblockForgeEntry {
  id: string
  startTime: number
}

export interface MayorResponse extends HypixelSuccessResponse {
  mayor: MayorCandidate & { minister?: { name: string; perk: MayorPerk }; election: MayorElection }
  current?: MayorElection
}

export interface MayorElection {
  candidates: MayorCandidate[]
}

export interface MayorCandidate {
  key: string
  name: string
  perks: MayorPerk[]
  votes?: number
}

export interface MayorPerk {
  name: string
  minister: boolean
}

export interface Bazaar extends HypixelSuccessResponse {
  products: Record<string, BazaarItem>
}

export interface BazaarItem {
  sell_summary: { pricePerUnit: number }[]
  quick_status: { sellPrice: number; buyPrice: number }
}

export interface GardenResponse extends HypixelSuccessResponse {
  garden: Garden | undefined
}

export interface Garden {
  garden_experience: number
  commission_data: { completed: Record<string, number> }
  resources_collected: Record<string, number>
  crop_upgrade_levels: Record<string, number>
}

export interface SkyblockMuseumResponse extends HypixelSuccessResponse {
  members: Record<string, unknown>
}

export interface HypixelSkyblockSkillsResponse extends HypixelSuccessResponse {
  lastUpdated: number
  version: string
  skills: HypixelSkyblockSkills
}

export interface HypixelSkyblockSkills {
  FARMING: HypixelSkyblockSkill
  MINING: HypixelSkyblockSkill
  COMBAT: HypixelSkyblockSkill
  FORAGING: HypixelSkyblockSkill
  FISHING: HypixelSkyblockSkill
  ENCHANTING: HypixelSkyblockSkill
  ALCHEMY: HypixelSkyblockSkill
  CARPENTRY: HypixelSkyblockSkill
  RUNECRAFTING: HypixelSkyblockSkill
  SOCIAL: HypixelSkyblockSkill
  TAMING: HypixelSkyblockSkill
  HUNTING: HypixelSkyblockSkill
}

export interface HypixelSkyblockSkill {
  name: string
  description: string
  maxLevel: number
  levels: HypixelSkyblockSkillLevel[]
}

export interface HypixelSkyblockSkillLevel {
  level: number
  totalExpRequired: number
  unlocks: string[]
}

/* eslint-enable @typescript-eslint/naming-convention */
