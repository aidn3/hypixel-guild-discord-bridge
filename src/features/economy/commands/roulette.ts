import { ChannelType, Permission, Platform, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { EconomyRussianRoulette } from '../economy-constants.js'
import { type EconomyDatabase, EconomyOverflow, EconomyReason } from '../economy-database.js'

import { economyOverflow } from './common/common.js'

export default class Roulette extends ChatCommandHandler {
  private countSinceLastLose = 0

  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'roulette',
      triggers: ['roulette', 'rr'],
      description: 'Try your luck for aura or a 15 minute mute',
      example: `rr`
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { platforms: [Platform.Minecraft], sources: [ChannelType.Public] }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    let gameResult: { survived: boolean; aura: number }

    class NotEnoughFunds extends Error {}
    try {
      const user = context.message.user
      gameResult = this.database.transaction((context) => {
        const responsibleAccount = context.getAccount(user)
        const targetAmount = context.getAccount(user)
        const targetTotal = targetAmount.total()
        if (targetTotal < EconomyRussianRoulette.lose) throw new NotEnoughFunds()

        const survived = this.survived()

        if (survived) {
          responsibleAccount.increase(EconomyRussianRoulette.win, { reason: EconomyReason.RussianRoulette })
          return { survived: true, aura: EconomyRussianRoulette.win }
        }

        responsibleAccount.decrease(EconomyRussianRoulette.lose, { reason: EconomyReason.RussianRoulette })
        return { survived: false, aura: EconomyRussianRoulette.lose }
      })
    } catch (error: unknown) {
      context.resetCooldown()
      if (error instanceof NotEnoughFunds) return `${context.username}, not enough funds to use this command!`
      if (error instanceof EconomyOverflow) return economyOverflow(error)
      throw error
    }

    if (!gameResult.survived) {
      const muteDuration = EconomyRussianRoulette.mute
      if ((await context.message.user.permission()) < Permission.Helper && !(await context.message.user.immune())) {
        await context.message.user.mute(
          context.eventHelper.fillBaseEvent(),
          PunishmentPurpose.Game,
          muteDuration,
          'Lost in RussianRoulette game'
        )
      }
    }

    const messages = gameResult.survived
      ? context.app.i18n.t(($) => $['economy.roulette.win'], {
          returnObjects: true,
          username: context.username,
          aura: gameResult.aura
        })
      : context.app.i18n.t(($) => $['economy.roulette.lose'], {
          returnObjects: true,
          username: context.username,
          aura: gameResult.aura
        })
    return messages[Math.floor(Math.random() * messages.length)]
  }

  private survived(): boolean {
    // Default behaviour which is just "1/6 chance" is too unreliable
    // Some even managed to reach 24 win streak.
    // This will increase the chance of losing and cap the win streak as well

    const chance = 1 / 6
    const increasedLoseChanceAfter = 6
    const guaranteedLoseOn = 12

    let currentChance = chance

    if (this.countSinceLastLose > increasedLoseChanceAfter) {
      // This function has a starting point of (0,0) and goes to (inf,1)
      // with an increasingly faster slope with every step
      currentChance += -(1 / ((this.countSinceLastLose - increasedLoseChanceAfter) / 24 + 1)) + 1
    }
    if (this.countSinceLastLose >= guaranteedLoseOn) {
      currentChance = 1
    }

    if (Math.random() < currentChance) {
      this.countSinceLastLose = 0
      return false
    } else {
      this.countSinceLastLose++
      return true
    }
  }
}
