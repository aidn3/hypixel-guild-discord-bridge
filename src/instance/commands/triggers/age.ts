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

    const timestamp = new Date(player.firstLogin)
    const day: string = timestamp.getDate().toString().padStart(2, '0')
    const month: string = (timestamp.getMonth() + 1).toString().padStart(2, '0')
    const year: string = timestamp.getFullYear().toString().slice(-2)

    // TODO: translatable
    return `${givenUsername} first logged in to hypixel on ${day}/${month}/${year} or about ${formatTime(Date.now() - player.firstLogin)} ago`
  }
}
