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

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stat = player.stats?.UHC
    if (stat === undefined) {
      return context.app.i18n.t(($) => $['commands.uhc.none'], { username: givenUsername })
    }

    const wins = (stat.wins ?? 0) + (stat.wins_solo ?? 0)
    const kills = (stat.kills ?? 0) + (stat.kills_solo ?? 0)
    const deaths = (stat.deaths ?? 0) + (stat.deaths_solo ?? 0)

    return context.app.i18n.t(($) => $['commands.uhc.response'], {
      username: givenUsername,
      level: this.getStarLevel(kills, wins),
      wins: wins,
      kills: kills,
      kdr: deaths > 0 ? kills / deaths : 0
    })
  }

  /*
   * @license MIT <https://github.com/Hypixel-API-Reborn/hypixel-api-reborn/blob/82e39bc4937c89d8bfa132554f33015b63ad328e/LICENSE>
   * @see https://github.com/Hypixel-API-Reborn/hypixel-api-reborn/blob/82e39bc4937c89d8bfa132554f33015b63ad328e/src/Structures/MiniGames/UHC/UHC.ts#L5
   */
  private getStarLevel(kills: number, wins: number): number {
    const sum = kills + wins * 10
    let starLevel = 1
    const sums = [0, 1, 6, 21, 46, 96, 171, 271, 521, 1021, 1321, 1621, 1921, 2221, 2521, Infinity]
    starLevel += sums.map((x) => x * 10 - sum).findIndex((x) => x > 0) - 1
    return starLevel
  }
}
