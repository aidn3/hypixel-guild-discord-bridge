import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations.js'
import { EconomySacrifice } from '../economy-constants.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyOverflow, EconomyReason } from '../economy-database.js'

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

    class NotEnoughFunds extends Error {
      constructor(public readonly total: number) {
        super()
      }
    }
    class AlreadyZero extends Error {}
    class TargetNotEnough extends Error {
      constructor(public readonly total: number) {
        super()
      }
    }

    try {
      const taxedAmount = this.database.transaction((context) => {
        const responsibleAccount = context.getAccount(responsibleUser)
        const targetAccount = context.getAccount(targetUser)
        const responsibleAmount = responsibleAccount.total()
        const targetTotal = targetAccount.total()

        if (targetTotal <= 0) throw new AlreadyZero()
        if (targetTotal < amount) throw new TargetNotEnough(targetTotal)

        const tax = EconomySacrifice.tax
        const taxedAmount = Math.ceil(tax * amount)
        if (responsibleAmount < taxedAmount) throw new NotEnoughFunds(responsibleAmount)

        responsibleAccount.decrease(taxedAmount, { reason: EconomyReason.SacrificeFrom, byUser: targetId })
        targetAccount.decrease(amount, { reason: EconomyReason.SacrificeTo, byUser: responsibleId })
        return taxedAmount
      })

      return `${context.username}, -${taxedAmount.toLocaleString('en-US')} aura but ${targetUser.displayName()} -${amount.toLocaleString('en-US')}!`
    } catch (error: unknown) {
      if (error instanceof EconomyOverflow) {
        context.resetCooldown()
        return economyOverflow(error)
      } else if (error instanceof NotEnoughFunds) {
        context.resetCooldown()
        return `${responsibleUser.displayName()}, you only have ${error.total.toLocaleString('en-US')} aura.`
      } else if (error instanceof TargetNotEnough) {
        context.resetCooldown()
        return `${targetUser.displayName()} you only has ${error.total.toLocaleString('en-US')} aura.`
      } else if (error instanceof AlreadyZero) {
        context.resetCooldown()
        return `${targetUser.displayName()} does not have any aura left!`
      }

      throw error
    }
  }
}
