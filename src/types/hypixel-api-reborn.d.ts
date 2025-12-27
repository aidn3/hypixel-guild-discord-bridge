import type { skyblockMemberOptions } from 'hypixel-api-reborn'

// public api interfaces. Can't choose a naming convention
/* eslint-disable @typescript-eslint/naming-convention */
declare module 'hypixel-api-reborn' {
  interface Client {
    getSkyblockProfiles(
      query: string,
      options: Partial<skyblockMemberOptions> & { raw: true }
    ): Promise<SkyblockV2ProfilesRaw>

    getSkyblockGovernment(options?: methodOptions & { raw: true }): Promise<MayorV2>

    getSkyblockMuseum(
      query: string,
      profileId: string,
      options?: methodOptions & { raw: true }
    ): Promise<SkyblockMuseumRaw>
  }

  export interface SkyblockV2ProfilesRaw {
    profiles: SkyblockV2Profile[] | null
  }

  export interface SkyblockV2Profile {
    profile_id: string
    community_upgrades: SkyblockV2CommunityUpgrades
    members: Record<string, SkyblockV2Member>
    banking?: { balance: number }
    game_mode?: 'ironman' | 'bingo' | 'island'
    cute_name: string
    selected: boolean
  }

  export interface SkyblockV2Member {
    leveling?: { experience: number }
    currencies?: {
      coin_purse?: number
      essence?: Record<
        'WITHER' | 'DRAGON' | 'UNDEAD' | 'DIAMOND' | 'SPIDER' | 'GOLD' | 'ICE' | 'CRIMSON',
        { current: number }
      >
    }
    dungeons: SkyblockV2Dungeons | undefined
    rift?: SkyblockV2Rift
    fairy_soul?: { total_collected: number }
    trophy_fish?: Record<string, number> & { last_caught?: string; rewards?: number[] }
    accessory_bag_storage?: {
      selected_power?: string
      highest_magical_power: number
      tuning: { slot_0?: Record<string, number> }
    }
    collection?: Record<string, number>
    bestiary?: {
      kills: Record<string, number> & { last_killed_mob: string }
      milestone?: { last_claimed_milestone?: number }
    }
    inventory?: { bag_contents?: { talisman_bag: SkyblockV2Inventory } }
    profile: { bank_account?: number }
    player_data: { experience?: Record<string, number> }
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
    jacobs_contest?: Partial<{ perks: { farming_level_cap: number } }>
    events?: SkyblockPlayerEvents
    pets_data?: Partial<{ pet_care: { pet_types_sacrificed?: string[] } }>
    essence?: SkyblockV2Essence
    forge?: SkyblockForge
  }

  export interface SkyblockV2Inventory {
    type: 0
    data: string
  }

  export interface SkyblockV2Essence {
    perks?: SkyblockV2EssencePerks
  }

  export interface SkyblockV2EssencePerks {
    cold_efficiency?: number
    heart_of_gold?: number
    diamond_in_the_rough?: number
    toxophilite?: number
    unbridled_rage?: number
  }

  export interface SkyblockV2Dungeons {
    dungeon_types: SkyblockV2DungeonsTypes
    player_classes?: Record<'healer' | 'mage' | 'berserk' | 'archer' | 'tank', SkyblockV2DungeonsClass | undefined>
    treasures?: { runs?: SkyblockV2DungeonRun[] }
  }

  export interface SkyblockV2DungeonsTypes {
    catacombs: SkyblockV2DungeonsCatacombs
    master_catacombs: SkyblockV2DungeonsMasterCatacombs
  }

  export type DungeonFloors = '1' | '2' | '3' | '4' | '5' | '6' | '7'
  export type DungeonFloorsWithEntrance = '0' | DungeonFloors

  export interface SkyblockV2DungeonsCatacombs {
    experience: number
    tier_completions: Record<DungeonFloorsWithEntrance | 'total', number | undefined> | undefined
    fastest_time: Record<DungeonFloorsWithEntrance | 'best', number | undefined> | undefined
    fastest_time_s: Record<DungeonFloors | 'best', number | undefined> | undefined
    fastest_time_s_plus: Record<DungeonFloors | 'best', number | undefined> | undefined
  }

  export interface SkyblockV2DungeonsMasterCatacombs {
    tier_completions: Record<DungeonFloors | 'total', number | undefined> | undefined
    fastest_time: Record<DungeonFloors | 'best', number | undefined> | undefined
    fastest_time_s: Record<DungeonFloors | 'best', number | undefined> | undefined
    fastest_time_s_plus: Record<DungeonFloors | 'best', number | undefined> | undefined
  }

  export interface SkyblockV2DungeonsClass {
    experience?: number
  }

  export interface SkyblockV2DungeonRun {
    completion_ts: number
    dungeon_type: 'catacombs' | 'master_catacombs'
    dungeon_tier: number
    participants: { player_uuid: string; display_name: string }[]
  }

  export interface SkyblockV2Rift {
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

  export interface MayorV2 {
    mayor: MayorCandidateV2 & { minister?: { name: string; perk: MayorPerkV2 }; election: MayorElectionV2 }
    current?: MayorElectionV2
  }

  export interface MayorElectionV2 {
    candidates: MayorCandidateV2[]
  }

  export interface MayorCandidateV2 {
    key: string
    name: string
    perks: MayorPerkV2[]
    votes?: number
  }

  export interface MayorPerkV2 {
    name: string
    minister: boolean
  }

  interface SkyblockMuseumRaw {
    members: Record<string, unknown>
  }
}
/* eslint-enable @typescript-eslint/naming-convention */
