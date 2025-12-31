import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Woolwars extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['woolwars', 'woolwar', 'ww'],
      description: "Returns a player's Woolwars stats",
      example: `woolwars %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stat = player.stats?.WoolGames?.wool_wars?.stats
    if (stat === undefined) {
      return context.app.i18n.t(($) => $['commands.woolwars.none'], { username: givenUsername })
    }

    return context.app.i18n.t(($) => $['commands.woolwars.response'], {
      username: givenUsername,
      games: stat.games_played ?? 0,
      wins: stat.wins ?? 0,
      kills: stat.kills ?? 0,
      kdr: (stat.deaths ?? 0) > 0 ? (stat.kills ?? 0) / (stat.deaths ?? 0) : 0
    })
  }
}
