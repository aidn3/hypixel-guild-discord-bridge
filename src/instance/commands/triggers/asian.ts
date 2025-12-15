import type { ChatEvent } from '../../../common/application-event.js'
import { PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
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
      if (!event.user.equalsUser(context.message.user)) return

      const match = /^\d+/g.exec(event.message)
      if (!match) return

      const guess = Number.parseInt(match[0], 10)
      if (guess === math.answer) timeout.resolve(guess)
    }

    context.app.on('chat', listener)
    await context.sendFeedback(`${context.username}, quick: ${math.expression}`)
    timeout.refresh()

    const result = await timeout.wait()
    context.app.off('chat', listener)

    if (result === math.answer) {
      return 'Big brain!'
    } else {
      await context.message.user.mute(
        context.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        Duration.minutes(1),
        `failed ${context.commandPrefix}${this.triggers[0]}`
      )
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
}
