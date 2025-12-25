import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

export default class Smash extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['smash', 'smashheroes', 'sh'],
      description: "Returns a player's Smash Heroes stats",
      example: `smash %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.smashheroes
    if (stats === undefined) return `${givenUsername} has never played Smash Heroes.`

    const level = stats.level
    const kills = stats.kills
    const deaths = stats.deaths
    const wins = stats.wins

    return (
      `[${level}] ${givenUsername}'s Smash Heroes: ` +
      `Kills: ${shortenNumber(kills)} | Deaths: ${shortenNumber(deaths)} | Wins: ${shortenNumber(wins)}`
    )
  }
}
