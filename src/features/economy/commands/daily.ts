import { Platform } from '../../../common/application-event'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import type { EconomyConfigurations } from '../economy-configurations'
import { EconomyDaily } from '../economy-constants'
import type { EconomyDatabase } from '../economy-database'
import { EconomyOverflow, EconomyReason } from '../economy-database'

import { economyOverflow } from './common/common'

export default class Daily extends ChatCommandHandler {
  constructor(
    private readonly database: EconomyDatabase,
    private readonly configuration: EconomyConfigurations
  ) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-daily',
      triggers: ['daily'],
      description: 'daily increase your aura',
      example: `daily`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.User, duration: EconomyDaily.cooldown }
  }

  override requirements(context: ChatCommandContext): ChatCommandRequirements | string {
    if (this.configuration.getDailyIngameOnly()) {
      return { platforms: [Platform.Minecraft] }
    }

    return super.requirements(context)
  }

  handler(context: ChatCommandContext): string {
    const user = context.message.user
    try {
      this.database.transaction((context) => {
        const account = context.getAccount(user)
        account.increase(EconomyDaily.amount, { reason: EconomyReason.DailyReward })
      })
    } catch (error: unknown) {
      if (error instanceof EconomyOverflow) return economyOverflow(error)
      else throw error
    }

    return `${user.displayName()} claimed +${EconomyDaily.amount} daily aura!`
  }
}
