import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Skywars extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['skywars', 'skywar', 'sw'],
      description: "Returns a player's skywars common stats",
      example: `sw %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stat = player.stats?.SkyWars
    if (stat === undefined) {
      return context.app.i18n.t(($) => $['commands.skywars.none'], { username: givenUsername })
    }

    /*
     * Calculating level is too hard for now. Maybe do it one day if there is demand.
     */
    return context.app.i18n.t(($) => $['commands.skywars.response'], {
      username: givenUsername,
      games: stat.games_played_skywars ?? 0,
      kills: stat.kills ?? 0,
      kdr: (stat.deaths ?? 0) > 0 ? (stat.kills ?? 0) / (stat.deaths ?? 0) : 0
    })
  }
}
