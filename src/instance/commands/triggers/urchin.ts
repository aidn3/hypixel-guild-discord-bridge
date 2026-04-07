import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class UrchinCommand extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['urchin'],
      description: "Returns a player's Urchin blacklist tags",
      example: `urchin %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    if (context.app.urchinApi === undefined) {
      return `${givenUsername}, Urchin API is not configured.`
    }

    const response = await context.app.urchinApi.getPlayer(givenUsername)
    if (response === undefined) {
      return `${givenUsername}, player not found on Urchin.`
    }

    if (response.tags.length === 0) {
      return `${givenUsername} has no Urchin tags.`
    }

    const lines = response.tags.map((tag) => `${tag.type}: ${tag.reason}`)
    return `${givenUsername} has the following Urchin tags:\n${lines.join('\n')}`
  }
}
