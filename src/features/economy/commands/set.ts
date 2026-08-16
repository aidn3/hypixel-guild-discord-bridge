import { Permission } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyOverflow, EconomyReason } from '../economy-database.js'

import { economyOverflow, resolveAmount, resolveTarget } from './common/common.js'

export default class Set extends ChatCommandHandler {
  constructor(
    private readonly database: EconomyDatabase,
    private readonly configuration: EconomyConfigurations
  ) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-set',
      triggers: ['set'],
      description: 'set a player aura',
      example: `set %s 100`
    })
  }

  override requirements(): ChatCommandRequirements | string {
    if (this.configuration.getAllowModeratorsManagement()) {
      return { permission: Permission.Officer }
    }

    return { permission: Permission.BridgeAdmin }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const targetUser = await resolveTarget(context, context.args.at(0))
    if (typeof targetUser === 'string') {
      context.resetCooldown()
      return targetUser
    }

    const amount = resolveAmount(context, context.args.at(1))
    if (typeof amount === 'string') {
      context.resetCooldown()
      return amount
    }

    const responsibleId = context.app.core.users.resolveUserId(context.message.user.getUserIdentifier())
    try {
      this.database.transaction((context) => {
        const account = context.getAccount(targetUser)
        account.set(amount, { reason: EconomyReason.UserSet, byUser: responsibleId })
      })
    } catch (error: unknown) {
      if (error instanceof EconomyOverflow) return economyOverflow(error)
      else throw error
    }

    return `${targetUser.displayName()} aura has been set to ${amount.toLocaleString('en-US')}.`
  }
}
