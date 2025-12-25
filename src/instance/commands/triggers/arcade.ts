import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Arcade extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['arcade', 'arc'],
      description: "Returns a player's Arcade games stats",
      example: `arcade %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.arcade
    if (stats === undefined) return `${givenUsername} has never played Arcade games.`

    const coins = stats.coins

    return `${givenUsername}'s Arcade: Coins: ${shortenNumber(coins)}`
  }
}
