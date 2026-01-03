import type { HypixelSuccessResponse } from './hypixel-api'

export interface HypixelPlayerStatusResponse extends HypixelSuccessResponse {
  session: HypixelPlayerStatus
}

export type HypixelPlayerStatus = HypixelPlayerStatusOnline | HypixelPlayerStatusOffline
export interface HypixelPlayerStatusOffline {
  online: false
}

export interface HypixelPlayerStatusOnline {
  online: true
  gameType: string
  mode: string
  map?: string
}
