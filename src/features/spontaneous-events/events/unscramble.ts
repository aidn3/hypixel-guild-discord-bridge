import { entries as scrambleEntries } from '../../../../resources/events/unscramble.json' with { type: 'json' }
import type { ChatEvent, ChatLike } from '../../../common/application-event.js'
import { ChannelType, Color } from '../../../common/application-event.js'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations.js'
import type Duration from '../../../utility/duration.js'
import { Timeout } from '../../../utility/timeout.js'
import { type EventContext, type EventResult, shuffleArrayInPlace, SpontaneousEventHandler } from '../common.js'

export class Unscramble extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.Unscramble)
  }

  override async startEvent(): Promise<EventResult> {
    const context: EventContext = {
      application: this.application,
      eventHelper: this.eventHelper,
      logger: this.logger,
      broadcastMessage: (message, color) => this.broadcastMessage(message, color)
    }

    const duration = this.application.core.spontaneousEventsConfigurations.getUnscrambleDuration()
    const result = await startUnscramble(context, duration)
    await context.broadcastMessage(result.message, result.color)

    return result.eventResult
  }
}

export async function startUnscramble(
  context: EventContext,
  time: Duration
): Promise<{ message: string; color: Color; eventResult: EventResult }> {
  const chosenWord = pickWord()

  const timeout = new Timeout<ChatEvent>(time.toMilliseconds())

  const listener = (event: ChatEvent) => {
    if (event.channelType !== ChannelType.Public) return

    const match = event.message.trim()
    if (match.toLowerCase() === chosenWord.original.toLowerCase()) timeout.resolve(event)
  }

  let result: ChatLike | undefined = undefined
  try {
    context.application.on('chat', listener)
    timeout.refresh()
    let response = `Unscramble: ${chosenWord.scrambled}`
    if (chosenWord.hint !== undefined) response += ` - Hint: ${chosenWord.hint}`
    await context.broadcastMessage(response, Color.Good)

    result = await timeout.wait()
  } finally {
    context.application.off('chat', listener)
  }

  // eslint-disable-next-line unicorn/prefer-ternary
  if (result === undefined) {
    return { message: `The answer is: ${chosenWord.original} :(`, color: Color.Info, eventResult: { type: 'ended' } }
  } else {
    return {
      message: `Good job ${result.user.displayName()}!`,
      color: Color.Good,
      eventResult: { type: 'win', user: result.user }
    }
  }
}

function pickWord(): { original: string; scrambled: string; hint?: string } {
  const entry = scrambleEntries[Math.floor(Math.random() * scrambleEntries.length)]
  const pickedWord = entry.unscramble[Math.floor(Math.random() * entry.unscramble.length)]
  const hint = entry.hint

  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  const characters = [...pickedWord]
  const letters = characters.filter((character) => character !== ' ')
  const pickedWordReversed = letters.toReversed().join('')

  for (let tryCount = 0; tryCount < 50; tryCount++) {
    const scrambledLetters = shuffleArrayInPlace([...letters])
    const scrambled = applyLettersToPattern(characters, scrambledLetters)

    if (scrambled !== pickedWord && scrambled.replaceAll(' ', '') !== pickedWordReversed) {
      return { original: pickedWord, scrambled: scrambled, hint }
    }
  }

  return {
    original: pickedWord,
    // eslint-disable-next-line @typescript-eslint/no-misused-spread
    scrambled: applyLettersToPattern(characters, [...pickedWordReversed]),
    hint
  }
}

function applyLettersToPattern(pattern: string[], letters: string[]): string {
  let letterIndex = 0
  return pattern.map((character) => (character === ' ' ? ' ' : letters[letterIndex++])).join('')
}
