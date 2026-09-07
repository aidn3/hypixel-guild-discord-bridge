import { ChannelType } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import { EconomyRob } from '../economy-constants.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyOverflow, EconomyReason } from '../economy-database.js'

import { economyOverflow, resolveAmount, resolveDifferentTarget } from './common/common.js'

export default class Rob extends ChatCommandHandler {
  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-rob',
      triggers: ['rob', 'robbery'],
      description: "rob another user's aura with high chance of backfiring",
      example: `rob %s 100`
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { sources: [ChannelType.Public] }
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: EconomyRob.cooldown }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const targetUser = await resolveDifferentTarget(context, context.args.at(0))
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

    const responsibleUser = context.message.user
    const responsibleId = context.app.core.users.resolveUserId(responsibleUser.getUserIdentifier())
    const targetId = context.app.core.users.resolveUserId(targetUser.getUserIdentifier())

    try {
      return this.database.transaction((transaction) => {
        const responsibleAccount = transaction.getAccount(responsibleUser)
        const targetAccount = transaction.getAccount(targetUser)

        const responsibleTotal = responsibleAccount.total()
        const riskedAmount = amount * EconomyRob.risk
        if (responsibleTotal < riskedAmount) {
          context.resetCooldown()
          return `${responsibleUser.displayName()}, you need at least ${riskedAmount} to try to rob ${amount}!`
        }

        const targetTotal = targetAccount.total()
        if (targetTotal < amount) {
          context.resetCooldown()
          return `${targetUser.displayName()}, only has ${targetTotal}!`
        }

        if (Math.random() < EconomyRob.winChance) {
          responsibleAccount.increase(amount, { reason: EconomyReason.RobberSuccess, byUser: targetId })
          targetAccount.decrease(amount, { reason: EconomyReason.Robbed, byUser: responsibleId })
          return `${responsibleUser.displayName()}, stole ${amount} from ${targetUser.displayName()}!`
        } else {
          responsibleAccount.decrease(riskedAmount, { reason: EconomyReason.RobberFail, byUser: targetId })
          return `${responsibleUser.displayName()}, got caught trying to steal from ${targetUser.displayName()} and lost ${riskedAmount}!`
        }
      })
    } catch (error: unknown) {
      if (error instanceof EconomyOverflow) {
        context.resetCooldown()
        return economyOverflow(error)
      }

      throw error
    }
  }
}
