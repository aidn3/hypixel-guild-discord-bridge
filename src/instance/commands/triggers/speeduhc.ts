import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Speed extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['speeduhc', 'suhc', 'speed'],
      description: "Returns a player's Speed UHC stats",
      example: `speed %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.speeduhc
    if (stats === undefined) return `${givenUsername} has never played Speed UHC.`

    const kills = stats.kills
    const deaths = stats.deaths
    const kdr = stats.KDRatio
    const wins = stats.wins
    const coins = stats.coins

    return (
      `${givenUsername}'s Speed UHC: ` +
      `Kills: ${shortenNumber(kills)} | Deaths: ${shortenNumber(deaths)} | KDR: ${kdr.toFixed(2)} | ` +
      `Wins: ${shortenNumber(wins)} | Coins: ${shortenNumber(coins)}`
    )
  }
}
