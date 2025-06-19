import Roulette from './instance/commands/triggers/roulette.js'
import DarkAuctionPlugin from './instance/features/implementations/dark-auction-plugin.js'
import StarfallCultPlugin from './instance/features/implementations/starfall-cult-plugin.js'
import Reaction from './instance/minecraft/handlers/reaction.js'

export interface LanguageConfig {
  darkAuctionReminder: string
  starfallReminder: string

  commandRouletteWin: string[]
  commandRouletteLose: string[]

  guildJoinReaction: string[]
  guildLeaveReaction: string[]
  guildKickReaction: string[]
}

export const DefaultLanguageConfig: LanguageConfig = {
  darkAuctionReminder: DarkAuctionPlugin.DefaultMessage,
  starfallReminder: StarfallCultPlugin.DefaultMessage,

  commandRouletteWin: Roulette.WinMessages,
  commandRouletteLose: Roulette.LossMessages,

  guildJoinReaction: Reaction.JoinMessages,
  guildLeaveReaction: Reaction.LeaveMessages,
  guildKickReaction: Reaction.KickMessages
}
