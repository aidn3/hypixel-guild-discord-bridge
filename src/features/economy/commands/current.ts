import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { usernameNotExists } from '../../../instance/commands/common/utility.js'
import type { EconomyDatabase } from '../economy-database.js'

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
    const givenUsername = context.args.at(0)

    let targetUser = context.message.user
    if (givenUsername !== undefined) {
      const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
      if (profile == undefined) return usernameNotExists(context, givenUsername)

      targetUser = await context.app.core.initializeMinecraftUser(profile, { guild: undefined })
    }

    const value = this.database.getValue(targetUser)
    return `${targetUser.displayName()} has ${value.toLocaleString('en-US')} aura.`
  }
}
