import type { skyblockMemberOptions } from 'hypixel-api-reborn'

declare module 'hypixel-api-reborn' {
  interface Client {
    getSkyblockProfiles(
      query: string,
      options: Partial<skyblockMemberOptions> & { raw: true }
    ): Promise<SkyblockV2ProfilesRaw>
  }

  export interface SkyblockV2ProfilesRaw {
    profiles: SkyblockV2Profile[]
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
    dungeons: SkyblockV2Dungeons
    nether_island_player_data: {
      kuudra_completed_tiers: {
        none: number
        hot: number
        burning: number
        fiery: number
        infernal: number
      }
    }
    slayer: SlayerProfile
  }

  export interface SkyblockV2Dungeons {
    dungeon_types: SkyblockV2DungeonsTypes
  }

  export interface SkyblockV2DungeonsTypes {
    catacombs: SkyblockV2DungeonsCatacombs
    master_catacombs: SkyblockV2DungeonsMasterCatacombs
  }

  export interface SkyblockV2DungeonsCatacombs {
    experience: number
    tier_completions: Record<'0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'total', number>
  }

  export interface SkyblockV2DungeonsMasterCatacombs {
    tier_completions: Record<'1' | '2' | '3' | '4' | '5' | '6' | '7' | 'total', number>
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
}
