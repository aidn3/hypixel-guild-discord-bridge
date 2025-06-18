import Reaction from './instance/minecraft/handlers/reaction.js'

export interface LanguageConfig {
  guildJoinReaction: string[]
  guildLeaveReaction: string[]
  guildKickReaction: string[]
}

export const DefaultLanguageConfig: LanguageConfig = {
  guildJoinReaction: Reaction.JoinMessages,
  guildLeaveReaction: Reaction.LeaveMessages,
  guildKickReaction: Reaction.KickMessages
}
