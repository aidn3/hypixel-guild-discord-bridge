import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

enum Rarities {
  Bronze = '_bronze',
  Silver = '_silver',
  Gold = '_gold',
  Diamond = '_diamond'
}

export default class TrophyFish extends ChatCommandHandler {
  private static readonly UniqueFish = 18

  constructor() {
    super({
      triggers: ['trophyfish', 'trophyfishing', 'trophy', 'tf'],
      description: "Returns a player's Skyblock trophy fishing progress",
      example: `trophy %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const stat = selectedProfile.trophy_fish ?? {}

    let total = 0
    const progress = new Map<string, number>()
    for (const [name, value] of Object.entries(stat)) {
      if (typeof value !== 'number') continue

      for (const [displayRarity, raritySuffix] of Object.entries(Rarities)) {
        if (!name.endsWith(raritySuffix)) continue
        total += value
        progress.set(displayRarity, (progress.get(displayRarity) ?? 0) + 1)
      }
    }

    if (total === 0) {
      return context.app.i18n.t(($) => $['commands.trophyfish.none'], { username: givenUsername })
    }

    const formatted = Object.keys(Rarities)
      .filter((displayRarity) => progress.has(displayRarity))
      .map((displayRarity) => `${displayRarity} ${progress.get(displayRarity)}/${TrophyFish.UniqueFish}`)

    return `${givenUsername} trophy fishing: Total ${total} - ${formatted.join(' - ')}`
  }
}
