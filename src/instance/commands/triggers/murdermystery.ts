import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Murdermystery extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['murdermystery', 'mm', 'murder'],
      description: "Returns a player's Murder Mystery stats",
      example: `mm %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.murdermystery
    if (stats === undefined) return `${givenUsername} has never played Murder Mystery.`

    const wins = stats.wins
    const kills = stats.kills

    return `${givenUsername}'s Murder Mystery: ` + `Wins: ${shortenNumber(wins)} | Kills: ${shortenNumber(kills)}`
  }
}
