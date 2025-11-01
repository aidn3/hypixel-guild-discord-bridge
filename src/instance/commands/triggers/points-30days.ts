import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

export default class Points30days extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['points30', 'points30days', 'point30days', '30dayspoints', '30dayspoint', '30points'],
      description: "Returns user's 30 days activity points ",
      example: `points30 %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const allPoints = context.app.core.scoresManager.getPoints30Days()
    const user = allPoints.find((entry) => entry.uuid === uuid)
    if (user === undefined) return `${givenUsername} does not have any activity`

    let response = `${givenUsername} 30 days points:`
    response += ` total ${user.total.toLocaleString('en-US')}`
    response += ` | chat ${user.chat.toLocaleString('en-US')}`
    response += ` | online ${user.online.toLocaleString('en-US')}`
    response += ` | commands ${user.commands.toLocaleString('en-US')}`

    return response
  }
}
