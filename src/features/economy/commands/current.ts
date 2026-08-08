import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { usernameNotExists } from '../../../instance/commands/common/utility'
import type { EconomyDatabase } from '../economy-database'

export default class Current extends ChatCommandHandler {
  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-current',
      triggers: ['aura', 'current', 'total'],
      description: "Returns a player's total aura",
      example: `aura %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (profile == undefined) return usernameNotExists(context, givenUsername)

    const user = await context.app.core.initializeMinecraftUser(profile, { guild: undefined })
    const value = this.database.getValue(user)
    return `${user.displayName()} has ${value.toLocaleString('en-US')} aura.`
  }
}
