import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { usernameNotExists } from '../common/utility.js'

export default class Uuid extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'uuid',
      triggers: ['username', 'name', 'ign', 'uuid'],
      description: 'Show the Mojang UUID of a player',
      example: 'uuid %s'
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (profile == undefined) return usernameNotExists(context, givenUsername)

    return `${profile.id}: ${profile.name}`
  }
}
