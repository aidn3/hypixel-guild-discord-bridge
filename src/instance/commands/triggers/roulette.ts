import { InstanceType, PunishmentType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'

const LossMessages = [
  '%s you got blasted!',
  '%s unlucky, wrong choice.',
  "%s it's not rigged, I promise!",
  '%s you got capped.',
  '%s enjoy the mute, haha!',
  '%s better luck next time. Or not...'
]

const WinMessages = [
  '%s you survived?!',
  '%s, lucky. Do it again!',
  '%s? Alive? shame.',
  "%s, I'll get you next time",
  '%s, perhaps I forgot to load it?',
  "%s you're crazy. Again again again!"
]

export default class Roulette extends ChatCommandHandler {
  private countSinceLastLose = 0

  constructor() {
    super({
      name: 'Roulette',
      triggers: ['roulette', 'rr'],
      description: 'Try your luck for a 15 minute mute',
      example: `rr`
    })
  }

  handler(context: ChatCommandContext): string {
    if (context.instanceType !== InstanceType.Minecraft) {
      return `${context.username}, Command can only be executed in-game!`
    }

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

      context.app.clusterHelper.sendCommandToAllMinecraft(`/g mute ${context.username} 15m`)
      context.app.punishmentsSystem.punishments.add({
        localEvent: true,
        instanceType: InstanceType.Minecraft,
        instanceName: context.instanceName,

        userName: context.username,
        // not really that important to resolve uuid since it ends fast and the punishment is just a game
        userUuid: undefined,
        userDiscordId: undefined,

        type: PunishmentType.Mute,
        till: Date.now() + 900_000,
        reason: 'Lost in RussianRoulette game'
      })

      return LossMessages[Math.floor(Math.random() * LossMessages.length)].replaceAll('%s', context.username)
    } else {
      this.countSinceLastLose++
    }

    return WinMessages[Math.floor(Math.random() * WinMessages.length)].replaceAll('%s', context.username)
  }
}
