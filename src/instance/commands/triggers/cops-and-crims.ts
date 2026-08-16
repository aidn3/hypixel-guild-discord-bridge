import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility.js'

export default class CopsAndCrims extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'cops-and-crims',
      triggers: ['cac', 'copsandcrims', 'copsandcriminals', 'mcgo'],
      description: "Returns a player's Cops and Crims stats",
      example: `mcgo %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const MCGO = player.stats?.MCGO
    if (MCGO == undefined) return context.app.i18n.t(($) => $['commands.mcgo.none'], { username: givenUsername })

    return context.app.i18n.t(($) => $['commands.mcgo.response'], {
      username: givenUsername,
      gamePlays: MCGO.game_plays ?? 0,
      gameWins: MCGO.game_wins ?? 0,
      kills: MCGO.kills ?? 0,
      shotsFired: MCGO.shots_fired ?? 0,
      headshotKills: MCGO.headshot_kills ?? 0,
      bombsPlanted: MCGO.bombs_planted ?? 0,
      bombsDefused: MCGO.bombs_defused ?? 0
    })
  }
}
