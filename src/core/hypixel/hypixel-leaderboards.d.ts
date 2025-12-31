// public api interfaces. Can't choose a naming convention
/* eslint-disable @typescript-eslint/naming-convention */

import type { HypixelSuccessResponse } from './hypixel-api'

export interface HypixelLeaderboardsResponse extends HypixelSuccessResponse {
  leaderboards: HypixelLeaderboards
}

export interface HypixelLeaderboards {
  BUILD_BATTLE: HypixelLeaderboard[]
}

export interface HypixelLeaderboard {
  path: string
  prefix: string
  title: string
  count: number
  leaders: string[]
}
