import { ChannelType, Permission, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import { EconomyAirstrike } from '../economy-constants.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyNotEnough, EconomyOverflow, EconomyReason } from '../economy-database.js'

import { economyOverflow, inSameGuild, resolveDifferentTarget } from './common/common.js'

export default class Airstrike extends ChatCommandHandler {
  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'airstrike',
      triggers: ['airstrike', 'as'],
      description: 'Mute a specific person to annoy them',
      example: `airstrike %s`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: EconomyAirstrike.cooldown }
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

    const sameGuildError = await inSameGuild(context, targetUser)
    if (typeof sameGuildError === 'string') {
      context.resetCooldown()
      return sameGuildError
    }

    const responsibleUser = context.message.user
    const targetId = context.app.core.users.resolveUserId(targetUser.getUserIdentifier())

    try {
      this.database.transaction((context) => {
        context
          .getAccount(responsibleUser)
          .decrease(EconomyAirstrike.amount, { reason: EconomyReason.AirstrikeTarget, byUser: targetId })
      })
    } catch (error: unknown) {
      if (error instanceof EconomyNotEnough) {
        context.resetCooldown()
        return `${context.message.user.displayName()}, need ${EconomyAirstrike.amount} aura to use this!`
      } else if (error instanceof EconomyOverflow) {
        return economyOverflow(error)
      }

      throw error
    }

    if ((await context.message.user.permission()) < Permission.Helper && !(await context.message.user.immune())) {
      await targetUser.mute(
        context.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        EconomyAirstrike.mute,
        `${context.commandPrefix}${this.triggers[0]} by ${responsibleUser.displayName()}`
      )
    }

    const profile = targetUser.mojangProfile()
    return `${profile.name} ${profile.name}! ${responsibleUser.displayName()} has a surprise for you :D`
  }
}
