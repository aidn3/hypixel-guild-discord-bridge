import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class BowSpleef extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['bowspleef', 'bs'],
      description: "Returns a player's Bow Spleef Duels stats",
      example: `bowspleef %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const duels = player.stats?.Duels
    if (duels == undefined) return context.app.i18n.t(($) => $['commands.duels.none'], { username: givenUsername })

    const wins = duels.bowspleef_duel_wins ?? 0
    const losses = duels.bowspleef_duel_losses ?? 0
    const shotsFired = duels.bowspleef_duel_bow_shots ?? 0
    // Technically theres a games played stat but it seems higher than it should be
    const gamesPlayed = wins + losses
    const winLossRatio = losses === 0 ? wins : Number((wins / losses).toFixed(2))

    return context.app.i18n.t(($) => $['commands.bowspleef.response'], {
      username: givenUsername,
      gamesPlayed,
      wins,
      losses,
      winLossRatio,
      shotsFired
    })
  }
}
