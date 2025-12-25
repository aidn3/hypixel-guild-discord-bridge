import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber } from '../../../common/helper-functions.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverEnteredCrimson,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

interface TrophyFishProfile {
  rewards?: number[]
  total_caught?: number
  [key: string]: number | number[] | undefined
}

const TrophyRanks = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const

export default class TrophyFish extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['trophyfish', 'trophyfishing', 'trophy', 'tf'],
      description: "Returns a player's trophy fishing stats",
      example: `trophyfish %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const trophyFish = (selectedProfile as { trophy_fish?: TrophyFishProfile }).trophy_fish
    if (!trophyFish) return playerNeverEnteredCrimson(givenUsername)

    const trophyKeys = Object.keys(trophyFish)
    const rewards = Array.isArray(trophyFish.rewards) ? trophyFish.rewards : []
    const lastReward = rewards.at(-1)
    const rankIndex = typeof lastReward === 'number' ? lastReward : 0
    const rank = TrophyRanks[rankIndex] ?? TrophyRanks[0]

    const caughtTotal = trophyFish.total_caught ?? 0
    const bronze = trophyKeys.filter((key) => key.endsWith('_bronze')).length
    const silver = trophyKeys.filter((key) => key.endsWith('_silver')).length
    const gold = trophyKeys.filter((key) => key.endsWith('_gold')).length
    const diamond = trophyKeys.filter((key) => key.endsWith('_diamond')).length

    return (
      `${givenUsername}'s Trophy Fishing rank: ${rank} | ` +
      `Caught: ${formatNumber(caughtTotal)} | ` +
      `Bronze: ${formatNumber(bronze)} / 18 | ` +
      `Silver: ${formatNumber(silver)} / 18 | ` +
      `Gold: ${formatNumber(gold)} | ` +
      `Diamond: ${formatNumber(diamond)} / 18`
    )
  }
}
