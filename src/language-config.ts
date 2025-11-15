import Mute from './instance/commands/triggers/mute.js'
import Roulette from './instance/commands/triggers/roulette.js'
import Vengeance from './instance/commands/triggers/vengeance.js'
import PlayerMuted from './instance/minecraft/handlers/player-muted.js'
import Reaction from './instance/minecraft/handlers/reaction.js'
import { SkyblockReminders } from './instance/skyblock-reminders'

export enum ApplicationLanguages {
  English = 'en',
  German = 'de',
  Arabic = 'ar'
}

export interface LanguageConfig {
  language: ApplicationLanguages
  darkAuctionReminder: string
  starfallReminder: string

  commandMuteGame: string[]

  commandRouletteWin: string[]
  commandRouletteLose: string[]

  commandVengeanceWin: string[]
  commandVengeanceDraw: string[]
  commandVengeanceLose: string[]

  announceMutedPlayer: string

  guildJoinReaction: string[]
  guildLeaveReaction: string[]
  guildKickReaction: string[]
}

export const DefaultLanguageConfig: Readonly<LanguageConfig> = {
  language: ApplicationLanguages.English,

  darkAuctionReminder: SkyblockReminders.DefaultDarkAuctionMessage,
  starfallReminder: SkyblockReminders.DefaultStarfallMessage,

  commandMuteGame: Mute.DefaultMessages,

  commandRouletteWin: Roulette.WinMessages,
  commandRouletteLose: Roulette.LossMessages,

  commandVengeanceWin: Vengeance.WinMessages,
  commandVengeanceDraw: Vengeance.DrawMessages,
  commandVengeanceLose: Vengeance.LossMessages,

  announceMutedPlayer: PlayerMuted.DefaultMessage,

  guildJoinReaction: Reaction.JoinMessages,
  guildLeaveReaction: Reaction.LeaveMessages,
  guildKickReaction: Reaction.KickMessages
}
