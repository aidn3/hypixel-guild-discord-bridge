// public api interfaces. Can't choose a naming convention
/* eslint-disable @typescript-eslint/naming-convention */
import type { HypixelSuccessResponse } from './hypixel-api'

export interface HypixelGuildResponse extends HypixelSuccessResponse {
  guild: HypixelGuild | undefined
}

export interface HypixelGuild {
  _id: string
  name: string
  name_lower: string
  coins: number
  coinsEver: number
  created: number
  exp: number
  members: HypixelGuildMember[]
  ranks: HypixelGuildRank[]
}

export interface HypixelGuildMember {
  uuid: string
  rank?: string
  joined: number
  expHistory: Record<string, number>
}

export interface HypixelGuildRank {
  name: string
  default: boolean
  tag: string
  created: number
  priority: number
}
/* eslint-enable @typescript-eslint/naming-convention */
