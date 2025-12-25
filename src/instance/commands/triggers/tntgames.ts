import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Tntgames extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['tntgames', 'tnt'],
      description: "Returns a player's TNT Games stats",
      example: `tnt %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.tntgames
    if (stats === undefined) return `${givenUsername} has never played TNT Games.`

    const wins = stats.wins
    const coins = stats.coins

    return `${givenUsername}'s TNT Games: Wins: ${shortenNumber(wins)} | Coins: ${shortenNumber(coins)}`
  }
}
