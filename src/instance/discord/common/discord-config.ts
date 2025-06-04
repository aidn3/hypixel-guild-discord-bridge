export const DefaultCommandFooter = 'Made by aidn5 with <3'

export interface DiscordConfig {
  publicChannelIds: string[]
  officerChannelIds: string[]
  helperRoleIds: string[]
  officerRoleIds: string[]

  loggerChannelIds: string[]

  alwaysReplyReaction: boolean
  enforceVerification: boolean

  guildOnline: boolean
  guildOffline: boolean
}

export const RepeatReaction: Emoji = { name: 'can_not_repeat_message', path: './resources/x.webp' }
export const BlockReaction: Emoji = { name: 'message_blocked_by_hypixel', path: './resources/x.webp' }
export const MutedReaction: Emoji = { name: 'you_are_muted', path: './resources/x.webp' }
export const FilteredReaction: Emoji = { name: 'profanity_filtered', path: './resources/alert.png' }

export const AllEmojis = [RepeatReaction, BlockReaction, MutedReaction, FilteredReaction]

export interface Emoji {
  name: string
  path: string
}
