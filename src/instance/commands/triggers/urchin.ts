import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { usernameNotExists } from '../common/utility'

export default class UrchinCommand extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['urchin'],
      description: "Returns a player's Urchin blacklist tags",
      example: `urchin %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.app.urchinApi === undefined) return `${context.username}, Urchin API is not configured.`

    const givenUsername = context.args.at(0) ?? context.username
    const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (profile === undefined) return usernameNotExists(context, givenUsername)

    const response = await context.app.urchinApi.getPlayer(profile.name)
    if (response === undefined) return `${profile.name}, player not found on Urchin.`
    if (response.tags.length === 0) return `${profile.name} has no Urchin tags.`

    const lines = response.tags.map((tag) => `${tag.type}: ${tag.reason}`)
    return `${profile.name} has the following Urchin tags:\n${lines.join('\n')}`
  }
}
