import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Woolwars extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['woolwars', 'ww'],
      description: "Returns a player's Wool Wars stats",
      example: `ww %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.woolwars as
      | {
          level?: number
          stats?: { overall?: Record<string, number> }
        }
      | undefined
    if (stats?.stats?.overall == undefined) return `${givenUsername} has never played Wool Wars.`

    const level = stats.level ?? 0
    const overall = stats.stats.overall

    const roundWins = overall.roundWins ?? 0
    const gamesPlayed = overall.gamesPlayed ?? 0
    const woolsPlaced = overall.woolsPlaced ?? 0
    const blocksBroken = overall.blocksBroken ?? 0
    const kdRatio = overall.KDRatio ?? 0

    const wlr = gamesPlayed > 0 ? roundWins / gamesPlayed : 0
    const wpp = gamesPlayed > 0 ? woolsPlaced / gamesPlayed : 0
    const wpg = blocksBroken > 0 ? woolsPlaced / blocksBroken : 0

    return (
      `[${Math.floor(level)}✫] ${givenUsername}: ` +
      `W: ${shortenNumber(roundWins)} | WLR: ${wlr.toFixed(2)} | KDR: ${kdRatio.toFixed(2)} | ` +
      `BB: ${shortenNumber(blocksBroken)} | WP: ${shortenNumber(woolsPlaced)} | ` +
      `WPP: ${wpp.toFixed(2)} | WPG: ${wpg.toFixed(2)}`
    )
  }
}
