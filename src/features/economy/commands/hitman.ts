import assert from 'node:assert'

import { ChannelType, Permission, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import Duration from '../../../utility/duration.js'
import { EconomyHitman } from '../economy-constants.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyReason } from '../economy-database.js'

import { inSameGuild, resolveAmount, resolveDifferentTarget } from './common/common.js'

export default class Hitman extends ChatCommandHandler {
  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-hitman',
      triggers: ['hitman', 'hm', 'shutup'],
      description: 'order a hit on a person to mute them',
      example: `hitman %s 100`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: EconomyHitman.cooldown }
  }

  override requirements(): ChatCommandRequirements | string {
    return { sources: [ChannelType.Public] }
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

    if (amount < EconomyHitman.min || amount > EconomyHitman.max) {
      context.resetCooldown()
      return `${context.username}, amount must be between ${EconomyHitman.min} and ${EconomyHitman.max}.`
    }

    const sameGuildError = await inSameGuild(context, targetUser)
    if (typeof sameGuildError === 'string') {
      context.resetCooldown()
      return sameGuildError
    }

    const responsibleUser = context.message.user
    const targetId = context.app.core.users.resolveUserId(targetUser.getUserIdentifier())

    this.database.transaction((transaction) => {
      const account = transaction.getAccount(responsibleUser)
      const total = account.total()
      if (total <= 0) {
        context.resetCooldown()
        return `${responsibleUser.displayName()}, no aura to use anything at all.`
      }
      if (total < amount) {
        context.resetCooldown()
        return `${responsibleUser.displayName()} only has ${total}.`
      }

      account.decrease(amount, { reason: EconomyReason.Hitman, byUser: targetId })
    })

    const seconds = amount * EconomyHitman.conversionRate
    assert.ok(seconds >= 60) // Hypixel minimum time
    const muteDuration = Duration.seconds(seconds)

    if ((await targetUser.permission()) < Permission.Helper && !(await targetUser.immune())) {
      await targetUser.mute(
        context.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        muteDuration,
        `${context.commandPrefix}${this.triggers[0]} by ${responsibleUser.displayName()}`
      )
    }

    return `${targetUser.displayName()} has been assassinated by ${responsibleUser.displayName()}!`
  }
}
