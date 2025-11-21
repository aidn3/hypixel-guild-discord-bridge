export const DefaultCommandFooter = 'Made by aidn5 with <3'

export const RepeatReaction: Emoji = { name: 'can_not_repeat_message', path: './resources/x.webp' }
export const BlockReaction: Emoji = { name: 'message_blocked_by_hypixel', path: './resources/x.webp' }
export const MutedReaction: Emoji = { name: 'you_are_muted', path: './resources/x.webp' }
export const GuildMutedReaction: Emoji = { name: 'account_guild_muted', path: './resources/x.webp' }
export const UnverifiedReaction: Emoji = { name: 'unverified', path: './resources/x.webp' }
export const FilteredReaction: Emoji = { name: 'profanity_filtered', path: './resources/alert.png' }

export const AllEmojis = [
  RepeatReaction,
  BlockReaction,
  MutedReaction,
  GuildMutedReaction,
  UnverifiedReaction,
  FilteredReaction
]

export interface Emoji {
  name: string
  path: string
}
