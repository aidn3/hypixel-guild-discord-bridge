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
  }

  export interface SkyblockV2ProfilesRaw {
    profiles: SkyblockV2Profile[] | undefined
  }

  export interface SkyblockV2Profile {
    profile_id: string
    community_upgrades: SkyblockV2CommunityUpgrades
    members: Record<string, SkyblockV2Member>
    banking?: { balance: number }
    cute_name: string
    selected: boolean
  }

  export interface SkyblockV2Member {
    leveling?: { experience: number }
    currencies?: { coin_purse?: number }
    dungeons: SkyblockV2Dungeons | undefined
    nether_island_player_data?: {
      selected_faction?: string
      mages_reputation?: number
      barbarians_reputation?: number

      kuudra_completed_tiers: {
        none: number
        hot: number
        burning: number
        fiery: number
        infernal: number
      }
    }
    slayer: SlayerProfile | undefined
    jacobs_contest?: Partial<{ perks: { farming_level_cap: number } }>
    pets_data?: Partial<{ pet_care: { pet_types_sacrificed: string[] } }>
    essence?: SkyblockV2Essence
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

  export interface MayorV2 {
    mayor: MayorCandidateV2 & { minister?: { name: string; perk: MayorPerkV2 }; election: MayorElectionV2 }
    current?: MayorElectionV2
  }

  export interface MayorElectionV2 {
    candidates: MayorCandidateV2[]
  }

  export interface MayorCandidateV2 {
    name: string
    perks: MayorPerkV2[]
    votes?: number
  }

  export interface MayorPerkV2 {
    name: string
    minister: boolean
  }
}
/* eslint-enable @typescript-eslint/naming-convention */
