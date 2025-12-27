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

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => {
      /* return undefined */
    })
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stat = player.stats?.megawalls
    if (stat === undefined || stat.playedGames === 0) {
      return context.app.i18n.t(($) => $['commands.megawalls.none'], { username: givenUsername })
    }

    const parts: string[] = []
    parts.push(`Games ${stat.playedGames.toLocaleString('en-US')}`)
    parts.push(`Wins ${stat.wins.toLocaleString('en-US')}`)
    parts.push(`Kills ${stat.finalKills.toLocaleString('en-US')}`)
    parts.push(`FKDR ${stat.KDRatio.toFixed(2)}`)

    return `${givenUsername}'s Megawalls: ${parts.join(' - ')}.`
  }
}
