import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Megawalls extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['megawalls', 'megawall', 'mw'],
      description: "Returns a player's Megawalls stats",
      example: `megawalls %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stat = player.stats?.Walls3
    if (stat === undefined || stat.games_played === 0) {
      return context.app.i18n.t(($) => $['commands.megawalls.none'], { username: givenUsername })
    }

    const deaths = stat.deaths ?? 0
    return context.app.i18n.t(($) => $['commands.megawalls.response'], {
      username: givenUsername,
      games: stat.games_played,
      wins: stat.wins,
      kills: stat.kills,
      kdr: deaths > 0 ? (stat.kills ?? 0) / deaths : 0
    })
  }
}
