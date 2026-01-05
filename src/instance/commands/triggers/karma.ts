import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Karma extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['karma'],
      description: "Returns a player's karma",
      example: `karma %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    return context.app.i18n.t(($) => $['commands.karma.response'], {
      username: givenUsername,
      karmaAmount: player.karma ?? 0
    })
  }
}
