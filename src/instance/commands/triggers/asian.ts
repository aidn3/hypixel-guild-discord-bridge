import type { ChatEvent } from '../../../common/application-event.js'
import { InstanceType, MinecraftSendChatPriority, PunishmentType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Timeout } from '../../../utility/timeout.js'

export default class Asian extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['asian'],
      description: 'Challenge yourself with math!',
      example: `asian %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const math = this.createMath()
    const timeout = new Timeout<number>(10_000)

    const listener = (event: ChatEvent) => {
      if (event.username !== context.username) return

      const match = /^\d+/g.exec(event.message)
      if (!match) return

      const guess = Number.parseInt(match[0], 10)
      if (guess === math.answer) timeout.resolve(guess)
    }

    context.sendFeedback(`${context.username}, quick: ${math.expression}`)
    context.app.on('chat', listener)
    const result = await timeout.wait()
    context.app.removeListener('chat', listener)

    if (result === math.answer) {
      return 'Big brain!'
    } else {
      this.mute(context, context.username)
      return `haiyaaaaaaaaa this is so easy, you're a disappointment *takes off slipper* (answer: ${math.answer})`
    }
  }

  private createMath(): { expression: string; answer: number } {
    const possibilities = [
      ...Array.from({ length: 5 }).fill('multiplication'),
      ...Array.from({ length: 10 }).fill('addition'),
      ...Array.from({ length: 5 }).fill('division'),
      ...Array.from({ length: 2 }).fill('hard')
    ] as ('multiplication' | 'addition' | 'division' | 'hard')[]

    const selected = possibilities[Math.floor(Math.random() * possibilities.length)]
    switch (selected) {
      case 'multiplication': {
        const a = Math.round(Math.random() * 12) + 1
        const b = Math.round(Math.random() * 12) + 1
        return { expression: `${a} * ${b}`, answer: a * b }
      }
      case 'addition': {
        const a = Math.round(Math.random() * 100) + 1
        const b = Math.round(Math.random() * 100) + 1
        return { expression: `${a} + ${b}`, answer: a + b }
      }
      case 'division': {
        for (let tries = 0; tries < 100; tries++) {
          const a = Math.round(Math.random() * 100) + 1
          const b = Math.round(Math.random() * 100) + 1
          if (a % b !== 0) continue
          return { expression: `${a} / ${b}`, answer: a / b }
        }

        break
      }
      case 'hard': {
        const a = Math.round(Math.random() * 5) + 1
        const b = Math.round(Math.random() * 10) + 1
        const c = Math.round(Math.random() * 12) + 1
        const d = Math.round(Math.random() * 4) + 1
        return { expression: `${a} + (${b} * ${c})^${d}`, answer: a + Math.pow(b * c, d) }
      }
    }

    throw new Error("Can't find a good math expression")
  }

  private mute(context: ChatCommandContext, selectedUsername: string): void {
    context.app.emit('minecraftSend', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: context.app.getInstancesNames(InstanceType.Minecraft),
      priority: MinecraftSendChatPriority.High,
      command: `/g mute ${selectedUsername} 1m`
    })

    context.app.moderation.punishments.add({
      ...context.eventHelper.fillBaseEvent(),

      userName: selectedUsername,
      // not really that important to resolve uuid since it ends fast and the punishment is just a game
      userUuid: undefined,
      userDiscordId: undefined,

      type: PunishmentType.Mute,
      till: Date.now() + 60_000,
      reason: `failed ${context.commandPrefix}${this.triggers[0]}`
    })
  }
}
