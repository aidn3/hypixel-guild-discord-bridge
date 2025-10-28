import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

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
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => {
      /* return undefined */
    })
    if (player == undefined || player.isRaw()) return `${givenUsername} has never played on Hypixel before?`

    return `${givenUsername}'s skywars level is ${player.stats.SkyWars.level.toFixed(0)}✫ with K/D ratio of ${player.stats.SkyWars.KDR.toFixed(2)}.`
  }
}
