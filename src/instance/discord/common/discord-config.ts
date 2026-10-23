import { Assets } from '../../../load-assets.js'

export const DefaultCommandFooter = 'Made by aidn5 with <3'

export const RepeatReaction: Emoji = { name: 'can_not_repeat_message', asset: Assets.xIcon }
export const BlockReaction: Emoji = { name: 'message_blocked_by_hypixel', asset: Assets.xIcon }
export const MutedReaction: Emoji = { name: 'you_are_muted', asset: Assets.xIcon }
export const BannedReaction: Emoji = { name: 'you_are_banned', asset: Assets.xIcon }
export const GuildMutedReaction: Emoji = { name: 'account_guild_muted', asset: Assets.xIcon }
export const UnverifiedReaction: Emoji = { name: 'unverified', asset: Assets.xIcon }
export const FilteredReaction: Emoji = { name: 'profanity_filtered', asset: Assets.alertIcon }

export const AllEmojis = [
  RepeatReaction,
  BlockReaction,
  MutedReaction,
  BannedReaction,
  GuildMutedReaction,
  UnverifiedReaction,
  FilteredReaction
]

export interface Emoji {
  name: string
  asset: Buffer
}

// Based on RadioGroup max size for when selecting an instance during Discord interactions
export const MaxMinecraftInstances = 10
