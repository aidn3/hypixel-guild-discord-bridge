import { ChannelType } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations.js'
import { EconomyDiss } from '../economy-constants.js'
import type { EconomyDatabase } from '../economy-database.js'
import { EconomyReason } from '../economy-database.js'

import { resolveDifferentTarget } from './common/common.js'

export default class Diss extends ChatCommandHandler {
  constructor(
    private readonly database: EconomyDatabase,
    private readonly configuration: EconomyConfigurations
  ) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'insult',
      triggers: ['diss', 'insult'],
      description: 'diss a player',
      example: `diss %s`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: EconomyDiss.cooldown }
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

    const responsibleId = context.app.core.users.resolveUserId(context.message.user.getUserIdentifier())
    this.database.tryDecrease(targetUser, EconomyDiss.amount, { reason: EconomyReason.Insult, byUser: responsibleId })

    const messages = context.app.i18n.t(($) => $['commands.insult'], {
      returnObjects: true,
      name: targetUser.displayName()
    })
    let message = messages[Math.floor(Math.random() * messages.length)]
    message = message.replaceAll('{username}', targetUser.mojangProfile().name)

    return message
  }
}
