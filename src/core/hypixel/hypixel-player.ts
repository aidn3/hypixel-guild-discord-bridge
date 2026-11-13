// public api interfaces. Can't choose a naming convention
/* eslint-disable @typescript-eslint/naming-convention */
import type { HypixelSuccessResponse } from './hypixel-api.js'

export interface HypixelPlayerResponse extends HypixelSuccessResponse {
  player: HypixelPlayer | null
}

export interface HypixelPlayer {
  lastLogout: number
  networkExp?: number
  socialMedia?: { links: { DISCORD?: string } }
  stats?: HypixelPlayerStats
  achievements?: HypixelPlayerAchievements
  newPackageRank?: string
  monthlyPackageRank?: string
  rank?: string
  levelUp_VIP?: number
  levelUp_VIP_PLUS?: number
  levelUp_MVP?: number
  levelUp_MVP_PLUS?: number
  firstLogin?: number
  karma?: number
  giftingMeta?: { ranksGiven?: number }
}

export interface HypixelPlayerStats {
  Bedwars?: { Experience?: number; wins_bedwars?: number; final_deaths_bedwars?: number; final_kills_bedwars?: number }
  BuildBattle?: { score?: number; wins?: number }
  Walls3?: {
    kills?: number
    deaths?: number
    wins?: number
    games_played?: number
  }
  UHC?: {
    // team game
    wins?: number
    kills?: number
    deaths?: number

    // solo
    wins_solo?: number
    kills_solo?: number
    deaths_solo?: number
  }
  MCGO?: {
    game_plays?: number
    kills?: number
    shots_fired?: number
    bombs_planted?: number
    headshot_kills?: number
    bombs_defused?: number
    game_wins?: number
  }
  WoolGames?: {
    wool_wars?: { stats?: { games_played?: number; kills?: number; wins?: number; deaths?: number } }
  }
  SkyWars?: { wins?: number; games_played_skywars?: number; deaths?: number; kills?: number }
  Duels?: {
    bowspleef_duel_losses?: number
    bowspleef_duel_wins?: number
    bowspleef_duel_bow_shots?: number
    best_winstreak_mode_bowspleef_duel?: number
  }
}

export interface HypixelPlayerAchievements {
  skyblock_treasure_hunter?: number
}

export function getPlayerRank(player: HypixelPlayer): HypixelPlayerRank {
  if (player.rank === 'STAFF') return HypixelPlayerRank.Staff
  if (player.rank === 'YOUTUBER') return HypixelPlayerRank.Youtuber
  if (player.monthlyPackageRank === 'SUPERSTAR') return HypixelPlayerRank.MvpPlusPlus
  if (player.newPackageRank === 'MVP_PLUS') return HypixelPlayerRank.MvpPlus
  if (player.newPackageRank === 'MVP') return HypixelPlayerRank.Mvp
  if (player.newPackageRank === 'VIP_PLUS') return HypixelPlayerRank.VipPlus
  if (player.newPackageRank === 'VIP') return HypixelPlayerRank.Vip
  if (player.newPackageRank === 'NONE') return HypixelPlayerRank.None
  return HypixelPlayerRank.None
}

export enum HypixelPlayerRank {
  Staff = 'Staff',
  Youtuber = 'YouTuber',
  MvpPlusPlus = 'MVP++',
  MvpPlus = 'MVP+',
  Mvp = 'MVP',
  VipPlus = 'VIP+',
  Vip = 'VIP',
  None = 'none'
}
