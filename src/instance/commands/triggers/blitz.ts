import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Blitz extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['blitz', 'hungergames', 'hg', 'sg'],
      description: "Returns a player's Blitz Survival Games stats",
      example: `blitz %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.blitzsg
    if (stats === undefined) return `${givenUsername} has never played Blitz SG.`

    const kills = stats.kills
    const wins = stats.wins
    const coins = stats.coins

    return (
      `${givenUsername}'s Blitz SG: ` +
      `Kills: ${shortenNumber(kills)} | Wins: ${shortenNumber(wins)} | Coins: ${shortenNumber(coins)}`
    )
  }
}
