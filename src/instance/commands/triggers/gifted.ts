import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Gifted extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['gifted', 'ranksgifted'],
      description: 'Returns how many times a player has gifted a rank',
      example: `gifted %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    return context.app.i18n.t(($) => $['commands.gifted.response'], {
      username: givenUsername,
      amountGifted: player.giftingMeta?.ranksGiven ?? 0
    })
  }
}
