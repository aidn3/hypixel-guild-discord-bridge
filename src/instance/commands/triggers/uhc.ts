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

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => {
      /* return undefined */
    })
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stat = player.stats?.uhc
    if (stat === undefined) {
      return context.app.i18n.t(($) => $['commands.uhc.none'], { username: givenUsername })
    }

    return context.app.i18n.t(($) => $['commands.uhc.response'], {
      username: givenUsername,
      level: stat.starLevel,
      wins: stat.wins,
      kills: stat.kills,
      kdr: stat.KDRatio
    })
  }
}
