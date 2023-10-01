import { skyblockMemberOptions } from 'hypixel-api-reborn'

declare module 'hypixel-api-reborn' {
  interface Client {
    getSkyblockProfiles(
      query: string,
      options: Partial<skyblockMemberOptions> & { raw: true }
    ): Promise<HypixelSkyblockRaw>
  }

  export interface HypixelSkyblockRaw {
    profiles: HypixelSkyblockProfileRaw[]
  }

  export interface HypixelSkyblockProfileRaw {
    selected: boolean
    cute_name: string
    profile_id: string
    members: Record<string, HypixelSkyblockMemberRaw>
    banking?: { balance?: number }
  }

  export type KuudraTier = 'none' | 'hot' | 'burning' | 'fiery' | 'infernal'

  export interface HypixelSkyblockMemberRaw {
    leveling?: { experience?: number }
    nether_island_player_data: {
      kuudra_completed_tiers: {
        none: number
        hot: number
        burning: number
        fiery: number
        infernal: number
      }
    }
    dungeons: {
      dungeon_types: {
        catacombs: {
          tier_completions: {
            '0': number
            '1': number
            '2': number
            '3': number
            '4': number
            '5': number
            '6': number
            '7': number
          }
        }
        master_catacombs: {
          tier_completions: {
            '1': number
            '2': number
            '3': number
            '4': number
            '5': number
            '6': number
            '7': number
          }
        }
      }
    }
  }

  export interface HypixelSkyblockMuseumRaw {
    members: Record<string, unknown>
  }
}
