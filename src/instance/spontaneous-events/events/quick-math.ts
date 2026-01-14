import type { ChatEvent } from '../../../common/application-event'
import { ChannelType, Color } from '../../../common/application-event'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations'
import { Timeout } from '../../../utility/timeout'
import { SpontaneousEventHandler } from '../common'

export class QuickMath extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.QuickMath)
  }

  override async startEvent(): Promise<void> {
    const math = this.createMath()
    if (math === undefined) return

    const timeout = new Timeout<ChatEvent>(10_000)

    const listener = (event: ChatEvent) => {
      if (event.channelType !== ChannelType.Public) return

      const match = /^\d+/g.exec(event.message)
      if (!match) return

      const guess = Number.parseInt(match[0], 10)
      if (guess === math.answer) timeout.resolve(event)
    }

    this.application.on('chat', listener)
    await this.broadcastMessage(`Quick Math: ${math.expression}`, Color.Good)
    timeout.refresh()

    const result = await timeout.wait()
    this.application.off('chat', listener)

    // eslint-disable-next-line unicorn/prefer-ternary
    if (result === undefined) {
      await this.broadcastMessage(`The answer is: ${math.answer} :(`, Color.Info)
    } else {
      await this.broadcastMessage(`Good job ${result.user.displayName()}!`, Color.Good)
    }
  }

  private createMath(): { expression: string; answer: number } | undefined {
    const possibilities = [
      ...Array.from({ length: 5 }).fill('multiplication'),
      ...Array.from({ length: 10 }).fill('addition'),
      ...Array.from({ length: 5 }).fill('trickyAddition'),
      ...Array.from({ length: 5 }).fill('division'),
      ...Array.from({ length: 2 }).fill('hard')
    ] as ('multiplication' | 'addition' | 'trickyAddition' | 'division' | 'hard')[]

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

        return undefined
      }
      case 'trickyAddition': {
        const a = Math.round(Math.random() * 100) + 1
        const b = Math.round(Math.random() * 10) + 1
        const c = Math.round(Math.random() * 10) + 1
        return { expression: `${a} + ${b} * ${c}`, answer: a + b * c }
      }
      case 'hard': {
        const a = Math.round(Math.random() * 5) + 1
        const b = Math.round(Math.random() * 10) + 1
        const c = Math.round(Math.random() * 12) + 1
        const d = Math.round(Math.random() * 4) + 1
        return { expression: `${a} + (${b} * ${c})^${d}`, answer: a + Math.pow(b * c, d) }
      }
    }
  }
}
