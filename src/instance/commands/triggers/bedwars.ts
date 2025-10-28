import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

export default class Bedwars extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['bedwars', 'bw'],
      description: "Returns a player's bedwars common stats",
      example: `bw %s`
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

    return `${givenUsername}'s bedwars level is ${player.stats.BedWars.level.toFixed(0)}✫ with FKDR of ${player.stats.BedWars.FKDR.toFixed(2)}.`
  }
}
