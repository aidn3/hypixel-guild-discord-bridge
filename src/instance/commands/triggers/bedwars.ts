import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/util.js'

export default class Bedwars extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Bedwars',
      triggers: ['bedwars', 'bw'],
      description: "Returns a player's bedwars final kill/death",
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
    if (player == undefined) return `${givenUsername} has never played on Hypixel before?`

    const stat = player.stats?.bedwars?.finalKDRatio
    if (stat === undefined) return `${givenUsername} has never played Bedwars before?`

    return `${givenUsername}'s bedwars FKDR is ${stat.toFixed(2)}.`
  }
}
