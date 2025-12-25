import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Uhc extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['uhc'],
      description: "Returns a player's UHC stats",
      example: `uhc %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.uhc
    if (stats === undefined) return `${givenUsername} has never played UHC.`

    const starLevel = stats.starLevel
    const kdRatio = stats.KDRatio
    const wins = stats.wins
    const headsEaten = stats.headsEaten

    return `[${starLevel}✫] ${givenUsername} | KDR: ${kdRatio.toFixed(2)} | W: ${wins} | Heads: ${headsEaten}`
  }
}
