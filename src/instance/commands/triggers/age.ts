import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatTime } from '../../../utility/shared-utility'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Age extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['age', 'joined'],
      description: 'Returns the day someone first logged on to hypixel',
      example: `age %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)
    if (player.firstLogin === undefined) return playerNeverPlayedHypixel(context, givenUsername)

    return context.app.i18n.t(($) => $['commands.age.response'], {
      username: givenUsername,
      firstLogin: new Date(player.firstLogin),
      timeSinceFirstLogin: formatTime(Date.now() - player.firstLogin)
    })
  }
}
