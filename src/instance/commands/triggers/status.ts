import type { Status as Session } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/util.js'

export default class Status extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Status',
      triggers: ['status', 'stalk'],
      description: "Show a player's Hypixel status and current location",
      example: `status %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const session = await context.app.hypixelApi.getStatus(uuid, { noCaching: true }).catch(() => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      return undefined
    })
    return this.formatStatus(givenUsername, session)
  }

  private formatStatus(username: string, session: Session | undefined): string {
    let result = username

    if (session === undefined) return result + "'s status is unknown"
    if (!session.online) return result + "'s status is either hidden or offline"

    if (session.game != undefined) result += ` is playing ${session.game.name}`
    if (session.mode != undefined) result += ` in ${session.mode.toLowerCase()}`
    if (session.map != undefined) result += ` map ${session.map}`

    return result
  }
}
