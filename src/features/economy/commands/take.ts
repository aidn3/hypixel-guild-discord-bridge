import { Permission } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyNotEnough, EconomyOverflow, EconomyReason } from '../economy-database.js'

import { economyOverflow, resolveAmount, resolveTarget } from './common/common.js'

export default class Take extends ChatCommandHandler {
  constructor(
    private readonly database: EconomyDatabase,
    private readonly configuration: EconomyConfigurations
  ) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-take',
      triggers: ['take'],
      description: "take a player's aura",
      example: `take %s 100`
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
      const newAmount = this.database.transaction((context) => {
        const account = context.getAccount(targetUser)
        account.decrease(amount, { reason: EconomyReason.UserTake, byUser: responsibleId })
        return account.total()
      })

      return `Took ${amount.toLocaleString('en-US')} aura from ${targetUser.displayName()}. ${newAmount.toLocaleString('en-US')} aura left!`
    } catch (error: unknown) {
      if (error instanceof EconomyNotEnough) {
        return `${targetUser.displayName()} only has ${error.current.toLocaleString('en-US')}.`
      } else if (error instanceof EconomyOverflow) {
        return economyOverflow(error)
      }

      throw error
    }
  }
}
