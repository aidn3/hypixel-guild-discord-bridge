import { Permission } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyOverflow, EconomyReason } from '../economy-database.js'

import { economyOverflow, resolveAmount, resolveTarget } from './common/common.js'

export default class Give extends ChatCommandHandler {
  constructor(
    private readonly database: EconomyDatabase,
    private readonly configuration: EconomyConfigurations
  ) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-give',
      triggers: ['give'],
      description: 'give a player aura',
      example: `give %s 100`
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
    } else if (amount <= 0) {
      context.resetCooldown()
      return `${context.message.user.displayName()}, amount must be at least 1!`
    }

    const responsibleId = context.app.core.users.resolveUserId(context.message.user.getUserIdentifier())
    try {
      this.database.transaction((context) => {
        const account = context.getAccount(targetUser)
        account.increase(amount, { reason: EconomyReason.UserGive, byUser: responsibleId })
      })
    } catch (error: unknown) {
      if (error instanceof EconomyOverflow) return economyOverflow(error)
      else throw error
    }

    return `${targetUser.displayName()} has been given ${amount.toLocaleString('en-US')} free aura!`
  }
}
