import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Pit extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['pit', 'thepit'],
      description: "Returns a player's Pit stats",
      example: `pit %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.pit
    if (stats === undefined) return `${givenUsername} has never played The Pit.`

    const kills = stats.kills
    const deaths = stats.deaths
    const kdr = deaths > 0 ? kills / deaths : kills
    const playtime = stats.playtime

    return (
      `${givenUsername}'s Pit: ` +
      `Kills: ${shortenNumber(kills)} | Deaths: ${shortenNumber(deaths)} | ` +
      `KDR: ${kdr.toFixed(2)} | Playtime: ${Math.floor(playtime / 60)}h`
    )
  }
}
