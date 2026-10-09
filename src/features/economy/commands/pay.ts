import { ChannelType } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import { EconomyPay } from '../economy-constants.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyReason } from '../economy-database.js'

import { resolveAmount, resolveDifferentTarget } from './common/common.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
const tax = EconomyPay.tax

export default class Pay extends ChatCommandHandler {
  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-pay',
      triggers: ['pay', 'donate'],
      description: `Give another player aura. You will be charged a ${tax}% tax on top of the amount sent.`,
      example: `pay %s 100`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: EconomyPay.cooldown }
  }

  override requirements(): ChatCommandRequirements | string {
    return { sources: [ChannelType.Public] }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const responsibleUser = context.message.user
    if (!responsibleUser.verified()) {
      context.resetCooldown()
      return `${responsibleUser.displayName()}, you must be linked to use this command!`
    }

    const givenUsername = context.args.at(0)
    const targetUser = await resolveDifferentTarget(context, givenUsername)
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
      return `${responsibleUser.displayName()}, amount must be at least 1!`
    }

    const responsibleId = context.app.core.users.resolveUserId(responsibleUser.getUserIdentifier())
    const targetId = context.app.core.users.resolveUserId(targetUser.getUserIdentifier())
    const taxedAmount = Math.floor((tax / 100) * amount)
    const totalAmount = amount + taxedAmount

    const result = this.database.transaction((transaction) => {
      const responsibleAccount = transaction.getAccount(responsibleUser)
      const responsibleBalance = responsibleAccount.total()
      const targetAccount = transaction.getAccount(targetUser)
      if (responsibleBalance < totalAmount) {
        context.resetCooldown()
        return `${responsibleUser.displayName()}, you need ${totalAmount - responsibleBalance} more aura to do this!`
      }

      responsibleAccount.decrease(totalAmount, { reason: EconomyReason.UserPayTo, byUser: targetId })
      targetAccount.increase(amount, { reason: EconomyReason.UserPayFrom, byUser: responsibleId })
    })
    if (result !== undefined) return result

    return `${targetUser.displayName()} has been paid ${amount.toLocaleString('en-US')} aura by ${responsibleUser.displayName()}!`
  }
}
