export interface HypixelSkyblock {
  profiles: HypixelSkyblockProfile[]
}

export interface HypixelSkyblockProfile {
  selected: boolean
  cute_name: string
  profile_id: string
  members: Record<string, HypixelSkyblockMember>
  banking?: { balance?: number }
}

export interface HypixelSkyblockMember {
  leveling?: { experience?: number }
}

export interface HypixelSkyblockMuseum {
  members: Record<string, unknown>
}
