import { ChannelType, Permission, Platform, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'

export default class Roulette extends ChatCommandHandler {
  public static readonly LossMessages = [
    '{username} you got blasted!',
    '{username} unlucky, wrong choice.',
    "{username} it's not rigged, I promise!",
    '{username} you got capped.',
    '{username} enjoy the mute, haha!',
    '{username} better luck next time. Or not...'
  ]

  public static readonly WinMessages = [
    '{username} you survived?!',
    '{username}, lucky. Do it again!',
    '{username}? Alive? shame.',
    "{username}, I'll get you next time",
    '{username}, perhaps I forgot to load it?',
    "{username} you're crazy. Again again again!"
  ]

  private countSinceLastLose = 0

  constructor() {
    super({
      triggers: ['roulette', 'rr'],
      description: 'Try your luck for a 15 minute mute',
      example: `rr`
    })
  }
  override requirements(): ChatCommandRequirements | string {
    return { platforms: [Platform.Minecraft], sources: [ChannelType.Public] }
  }

  async handler(context: ChatCommandContext): Promise<string> {
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

      if ((await context.message.user.permission()) < Permission.Helper && !(await context.message.user.immune())) {
        await context.message.user.mute(
          context.eventHelper.fillBaseEvent(),
          PunishmentPurpose.Game,
          Duration.minutes(15),
          'Lost in RussianRoulette game'
        )
      }

      const messages = context.app.core.languageConfigurations.getCommandRouletteLose()
      return messages[Math.floor(Math.random() * messages.length)].replaceAll('{username}', context.username)
    } else {
      this.countSinceLastLose++
    }

    const messages = context.app.core.languageConfigurations.getCommandRouletteWin()
    return messages[Math.floor(Math.random() * messages.length)].replaceAll('{username}', context.username)
  }
}
