import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations.js'
import { EconomySacrifice } from '../economy-constants.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyNotEnough, EconomyOverflow, EconomyReason } from '../economy-database.js'

import { economyOverflow, resolveAmount, resolveDifferentTarget } from './common/common.js'

export default class Sacrifice extends ChatCommandHandler {
  constructor(
    private readonly database: EconomyDatabase,
    private readonly configuration: EconomyConfigurations
  ) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-sacrifice',
      triggers: ['troll', 'sacrifice'],
      description: 'troll another user by reducing their aura',
      example: `troll %s 100`
    })
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
    }

    const responsibleUser = context.message.user
    const responsibleId = context.app.core.users.resolveUserId(responsibleUser.getUserIdentifier())
    const targetId = context.app.core.users.resolveUserId(targetUser.getUserIdentifier())

    class NothingGiven extends Error {}
    class AlreadyZero extends Error {}

    try {
      const amounts = this.database.transaction((context) => {
        const responsibleAccount = context.getAccount(responsibleUser)
        const targetAmount = context.getAccount(targetUser)
        const targetTotal = targetAmount.total()

        if (targetTotal <= 0) throw new AlreadyZero()
        const amountBeforeTax = Math.min(targetTotal, amount)

        const tax = EconomySacrifice.tax
        const taxedAmount = Math.floor((1 - tax / 100) * amountBeforeTax)
        if (taxedAmount <= 0) throw new NothingGiven()

        responsibleAccount.decrease(amountBeforeTax, { reason: EconomyReason.SacrificeFrom, byUser: targetId })
        targetAmount.increase(taxedAmount, { reason: EconomyReason.SacrificeTo, byUser: responsibleId })
        return { taxedAmount, amountBeforeTax }
      })

      return `${context.username}, -${amounts.amountBeforeTax.toLocaleString('en-US')} aura but ${targetUser.displayName()} -${amounts.taxedAmount.toLocaleString('en-US')}!`
    } catch (error: unknown) {
      if (error instanceof EconomyNotEnough) {
        context.resetCooldown()
        return `${responsibleUser.displayName()}, not enough funds to sacrifice that much!`
      } else if (error instanceof EconomyOverflow) {
        context.resetCooldown()
        return economyOverflow(error)
      } else if (error instanceof NothingGiven) {
        context.resetCooldown()
        return `${responsibleUser.displayName()}, you need to use more funds due to the high tax percentage!`
      } else if (error instanceof AlreadyZero) {
        context.resetCooldown()
        return `${targetUser.displayName()} funds are empty!`
      }

      throw error
    }
  }
}
