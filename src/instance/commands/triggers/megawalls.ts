import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Megawalls extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['megawalls', 'mw'],
      description: "Returns a player's Megawalls stats",
      example: `mw %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.megawalls
    if (stats === undefined) return `${givenUsername} has never played Megawalls.`

    const selectedClass = stats.selectedClass ?? 'None'
    const finalKills = stats.finalKills
    const finalKDRatio = stats.finalKDRatio
    const wins = stats.wins
    const wlRatio = stats.WLRatio
    const kills = stats.kills
    const kdRatio = stats.KDRatio
    const assists = stats.assists

    return (
      `${givenUsername}'s Megawalls: Class: ${selectedClass} | ` +
      `FK: ${shortenNumber(finalKills)} FKDR: ${finalKDRatio.toFixed(2)} | ` +
      `W: ${shortenNumber(wins)} WLR: ${wlRatio.toFixed(2)} | ` +
      `K: ${shortenNumber(kills)} KDR: ${kdRatio.toFixed(2)} | A: ${shortenNumber(assists)}`
    )
  }
}
