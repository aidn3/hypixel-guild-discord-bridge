export interface HypixelSkyblock {
  profiles: HypixelSkyblockProfile[]
}

export interface HypixelSkyblockProfile {
  selected: boolean
  cute_name: string
  members: Record<string, HypixelSkyblockMember>
  banking?: { balance?: number }
}

export interface HypixelSkyblockMember {
  leveling?: { experience?: number }
}
