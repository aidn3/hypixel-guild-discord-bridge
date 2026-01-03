import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { HypixelPlayerStatus } from '../../../core/hypixel/hypixel-status'
import { capitalize, formatTime } from '../../../utility/shared-utility'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

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

    const session = await context.app.hypixelApi.getPlayerStatus(uuid, Date.now())
    if (!session.online) {
      const player = await context.app.hypixelApi.getPlayer(uuid).catch(() => undefined)
      if (player !== undefined) {
        return `${givenUsername} was last online ${formatTime(Date.now() - player.lastLogout)} ago.`
      }
    }

    return this.formatStatus(givenUsername, session)
  }

  private formatStatus(username: string, session: HypixelPlayerStatus | undefined): string {
    let result = username

    if (session === undefined) return result + "'s status is unknown"
    if (!session.online) return result + "'s status is either hidden or offline"

    result += ` is playing ${capitalize(session.gameType)}`
    result += ` in ${session.mode.toLowerCase()}`
    if (session.map != undefined) result += ` map ${session.map}`

    return result
  }
}
