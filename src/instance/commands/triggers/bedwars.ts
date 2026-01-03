import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stat = player.stats?.Bedwars
    if (stat === undefined) {
      return context.app.i18n.t(($) => $['commands.bedwars.none'], { username: givenUsername })
    }

    return context.app.i18n.t(($) => $['commands.bedwars.response'], {
      username: givenUsername,
      level: this.getLevel(stat.Experience ?? 0),
      kills: stat.final_deaths_bedwars ?? 0,
      fkdr:
        (stat.final_deaths_bedwars ?? 0) > 0 ? (stat.final_kills_bedwars ?? 0) / (stat.final_deaths_bedwars ?? 0) : 0
    })
  }

  private getLevel(xp: number): number {
    let level = Math.floor(xp / 487_000) * 100
    xp = xp % 487_000
    if (xp < 500) return level + xp / 500
    level++
    if (xp < 1500) return level + (xp - 500) / 1000
    level++
    if (xp < 3500) return level + (xp - 1500) / 2000
    level++
    if (xp < 7000) return level + (xp - 3500) / 3500
    level++
    xp -= 7000
    return level + xp / 5000
  }
}
