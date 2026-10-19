import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, hypixelApiNotSet, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility.js'

export default class Karma extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'karma',
      triggers: ['karma'],
      description: "Returns a player's karma",
      example: `karma %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const hypixel = context.app.hypixel()
    if (hypixel === undefined) return hypixelApiNotSet(context)
    const player = await hypixel.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    return context.app.i18n.t(($) => $['commands.karma.response'], {
      username: givenUsername,
      karmaAmount: player.karma ?? 0
    })
  }
}
