/*
 CREDIT: Idea and originial code by Fusion
 Discord: fusionist__
 Minecraft username: Fusionist_
*/

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility.js'

export default class Bingo extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['bingo', 'bingoevent'],
      description: "Returns a player's current bingo progress",
      example: `bingo %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid === undefined) return usernameNotExists(context, givenUsername)

    const bingo = await context.app.hypixelApi.getPlayerBingo(uuid)

    const events = bingo.events ?? []

    const currentEvent = events.at(-1)
    if (currentEvent === undefined) {
      return context.app.i18n.t(($) => $['commands.bingo.none'], { username: givenUsername })
    }

    const points = currentEvent.points
    const completedGoals = currentEvent.completed_goals.length

    return context.app.i18n.t(($) => $['commands.bingo.response'], { username: givenUsername, completedGoals, points })
  }
}
