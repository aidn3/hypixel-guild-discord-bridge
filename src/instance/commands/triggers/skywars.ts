import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Skywars extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['skywars', 'skywar', 'sw'],
      description: "Returns a player's skywars stats",
      example: `sw %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => {
      /* return undefined */
    })
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.skywars
    if (stats === undefined) return `${givenUsername} has never played Skywars before?`

    const level = stats.level
    const kills = stats.kills
    const kdRatio = stats.KDRatio
    const wins = stats.wins
    const wlRatio = stats.WLRatio
    const coins = stats.coins

    return (
      `[${level.toFixed(0)}✫] ${givenUsername} ` +
      `Kills: ${shortenNumber(kills)} KDR: ${kdRatio.toFixed(2)} | ` +
      `Wins: ${shortenNumber(wins)} WLR: ${wlRatio.toFixed(2)} | ` +
      `Coins: ${shortenNumber(coins)}`
    )
  }
}
