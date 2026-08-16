import { ChannelType } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations.js'
import { EconomyGlaze } from '../economy-constants.js'
import { type EconomyDatabase, EconomyOverflow, EconomyReason } from '../economy-database.js'

import { resolveDifferentTarget } from './common/common.js'

export default class Glaze extends ChatCommandHandler {
  constructor(
    private readonly database: EconomyDatabase,
    private readonly configuration: EconomyConfigurations
  ) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'praise',
      triggers: ['glaze', 'praise'],
      description: 'Praise a player to increase their aura',
      example: `glaze %s`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: EconomyGlaze.cooldown }
  }

  override requirements(): ChatCommandRequirements | string {
    return { sources: [ChannelType.Public] }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args.at(0)
    const targetUser = await resolveDifferentTarget(context, givenUsername)
    if (typeof targetUser === 'string') {
      context.resetCooldown()
      return targetUser
    }

    const responsibleId = context.app.core.users.resolveUserId(context.message.user.getUserIdentifier())
    try {
      this.database.transaction((context) => {
        const account = context.getAccount(targetUser)
        account.increase(EconomyGlaze.amount, { reason: EconomyReason.Praise, byUser: responsibleId })
        return account.total()
      })
    } catch (error: unknown) {
      if (error instanceof EconomyOverflow) {
        // ignore
      } else {
        throw error
      }
    }

    // easter egg
    const messages =
      Math.random() > 0.01
        ? context.app.i18n.t(($) => $['commands.praise'], {
            returnObjects: true,
            name: targetUser.mojangProfile().name
          })
        : context.app.i18n.t(($) => $['commands.insult'], {
            returnObjects: true,
            name: targetUser.mojangProfile().name
          })
    return messages[Math.floor(Math.random() * messages.length)]
  }
}
