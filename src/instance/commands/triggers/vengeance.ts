import { InstanceType, MinecraftSendChatPriority, PunishmentType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, usernameNotExists } from '../common/util.js'

const LossMessages = [
  '%s tried to blast %u but failed epically and ended up blasting themself!',
  '%s unlucky, wrong choice.',
  '%s, this is what you get for trying to blast %u!',
  '%s died',
  '%s tried to mute %u but got muted instead, haha!',
  '%s better luck next time. Or not...',
  '%s was punished for trying to mute %u',
  '%s, aya, are you still trying to mute %u? How petty.'
]

const DrawMessages = [
  '%s Click. Click. Click. It is empty!',
  '%s, remind me what the plan was again?',
  '%s, I forgot to take vengeance.',
  '%s, I was supposed to take vengeance against %u but I changed my mind :P',
  '%s tried to kill %u but they dodged every bullet like Neo!'
]

const WinMessages = [
  '%s is Batman!',
  '%u survival was never an option',
  '%s, I am Agent 47. The job is done.',
  '%u? Dead? That was the only possible outcome.'
]

export default class Vengeance extends ChatCommandHandler {
  private countSinceLastWin = 0
  private consecutiveLose = 0

  constructor() {
    super({
      triggers: ['vengeance', 'v'],
      description: 'Try your luck against another player for a 15 minute mute',
      example: `v %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.instanceType !== InstanceType.Minecraft) {
      return `${context.username}, Command can only be executed in-game!`
    }

    const givenUsername = context.args[0] as string | undefined
    if (givenUsername === undefined) return `${context.username}, you need to specify someone!`

    // ensure user input is safe since it will be used
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    // 3% to win.
    // 47% to lose.
    // 49% to draw.
    if (this.won()) {
      this.mute(context, givenUsername)
      return WinMessages[Math.floor(Math.random() * WinMessages.length)]
        .replaceAll('%s', context.username)
        .replaceAll('%u', givenUsername)
    } else if (this.lose()) {
      this.countSinceLastWin++
      this.mute(context, context.username)
      return LossMessages[Math.floor(Math.random() * LossMessages.length)]
        .replaceAll('%s', context.username)
        .replaceAll('%u', givenUsername)
    } else {
      this.countSinceLastWin++
      return DrawMessages[Math.floor(Math.random() * DrawMessages.length)]
        .replaceAll('%s', context.username)
        .replaceAll('%u', givenUsername)
    }
  }

  private won(): boolean {
    const chance = 1 / 32
    const increasedChanceAfter = 12
    const guaranteedOn = 24

    let currentChance = chance

    if (this.countSinceLastWin > increasedChanceAfter) {
      // This function has a starting point of (0,0) and goes to (inf,1)
      // with an increasingly faster slope with every step
      currentChance += -(1 / ((this.countSinceLastWin - increasedChanceAfter) / 24 + 1)) + 1
    }
    if (this.countSinceLastWin >= guaranteedOn) {
      currentChance = 1
    }

    if (Math.random() < currentChance) {
      this.countSinceLastWin = 0
      return true
    }

    return false
  }

  private lose(): boolean {
    if (this.consecutiveLose >= 5) {
      this.consecutiveLose = 0
      return false
    }

    if (Math.random() < 0.5) {
      this.consecutiveLose++
      return true
    }

    this.consecutiveLose = 0
    return false
  }

  private mute(context: ChatCommandContext, username: string): void {
    context.app.emit('minecraftSend', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: context.app.getInstancesNames(InstanceType.Minecraft),
      priority: MinecraftSendChatPriority.High,
      command: `/g mute ${username} 15m`
    })

    context.app.moderation.punishments.add({
      ...context.eventHelper.fillBaseEvent(),

      userName: username,
      // not really that important to resolve uuid since it ends fast and the punishment is just a game
      userUuid: undefined,
      userDiscordId: undefined,

      type: PunishmentType.Mute,
      till: Date.now() + 900_000,
      reason: 'Lost in Vengeance game'
    })
  }
}
