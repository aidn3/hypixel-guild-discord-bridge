import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { capitalize, formatTime } from '../../../utility/shared-utility'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Status extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['status', 'stalk'],
      description: "Show a player's Hypixel status and current location",
      example: `status %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const currentTime = Date.now()
    const session = await context.app.hypixelApi.getPlayerStatus(uuid, currentTime)
    if (!session.online) {
      const player = await context.app.hypixelApi.getPlayer(uuid, currentTime)
      if (player === undefined) return playerNeverPlayedHypixel(context, givenUsername)

      if ('lastLogout' in player) {
        return context.app.i18n.t(($) => $['commands.status.last-online'], {
          username: givenUsername,
          time: formatTime(Date.now() - player.lastLogout)
        })
      }

      return context.app.i18n.t(($) => $['commands.status.api-disabled'], { username: givenUsername })
    }

    if (session.map !== undefined && session.mode !== undefined) {
      return context.app.i18n.t(($) => $['commands.status.online-with-map'], {
        username: givenUsername,
        game: capitalize(session.gameType),
        mode: session.mode.toLowerCase(),
        map: session.map
      })
    } else if (session.mode !== undefined) {
      return context.app.i18n.t(($) => $['commands.status.online-with-mode'], {
        username: givenUsername,
        game: capitalize(session.gameType),
        mode: session.mode.toLowerCase()
      })
    }

    return context.app.i18n.t(($) => $['commands.status.online'], {
      username: givenUsername,
      game: capitalize(session.gameType)
    })
  }
}
