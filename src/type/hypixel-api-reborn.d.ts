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

  export interface HypixelSkyblockMemberRaw {
    leveling?: { experience?: number }
  }

  export interface HypixelSkyblockMuseumRaw {
    members: Record<string, unknown>
  }
}
