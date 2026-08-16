import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility.js'

export default class PointsAll extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'points-all',
      triggers: ['points', 'point', 'allpoints', 'allpoint', 'pointall', 'pointsall'],
      description: "Returns user's all time activity points ",
      example: `points %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const allPoints = context.app.core.scoresManager.getPointsAlltime()
    const user = allPoints.find((entry) => entry.uuid === uuid)
    if (user === undefined) return `${givenUsername} does not have any activity`

    let response = `${givenUsername} all time points:`
    response += ` total ${user.total.toLocaleString('en-US')}`
    response += ` | chat ${user.chat.toLocaleString('en-US')}`
    response += ` | online ${user.online.toLocaleString('en-US')}`
    response += ` | commands ${user.commands.toLocaleString('en-US')}`

    return response
  }
}
