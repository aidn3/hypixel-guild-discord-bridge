import {
  indexLetters as IndexLetters,
  questions as TriviaEntries
} from '../../../../resources/events/trivia.json' with { type: 'json' }
import type { ChatEvent } from '../../../common/application-event.js'
import { ChannelType, Color } from '../../../common/application-event.js'
import type { User } from '../../../common/user.js'
import { SpontaneousEventsNames } from '../../../core/spontanmous-events-configurations.js'
import type Duration from '../../../utility/duration.js'
import { Timeout } from '../../../utility/timeout.js'
import { type EventContext, type EventResult, shuffleArrayInPlace, SpontaneousEventHandler } from '../common.js'

export class Trivia extends SpontaneousEventHandler {
  override enabled(): boolean {
    return this.application.core.spontaneousEventsConfigurations
      .getEnabledEvents()
      .includes(SpontaneousEventsNames.Trivia)
  }

  override async startEvent(): Promise<EventResult> {
    const context: EventContext = {
      application: this.application,
      eventHelper: this.eventHelper,
      logger: this.logger,
      broadcastMessage: (message, color) => this.broadcastMessage(message, color)
    }

    const duration = this.application.core.spontaneousEventsConfigurations.getTriviaDuration()
    const result = await startTrivia(context, duration)
    await context.broadcastMessage(result.message, result.color)

    return result.eventResult
  }
}

export async function startTrivia(
  context: EventContext,
  time: Duration
): Promise<{ message: string; color: Color; eventResult: EventResult }> {
  const trivia = createQuiz()

  const timeout = new Timeout<User>(time.toMilliseconds())
  const incorrectUsers: User[] = []

  const listener = (event: ChatEvent) => {
    if (event.channelType !== ChannelType.Public) return

    const match = /^(\w)(?=\b)[\s!@#$%^&*()_+\-=`~?>|\\\][{}]*$/g.exec(event.message.toLowerCase().trim())
    if (!match) return
    const matchedResult = match[1].toLowerCase()

    if (!IndexLetters.includes(matchedResult)) return

    for (const answeredUsers of incorrectUsers) {
      if (answeredUsers.equalsUser(event.user)) return
    }

    if (matchedResult === trivia.answerLetter.toLowerCase()) {
      timeout.resolve(event.user)
    } else {
      incorrectUsers.push(event.user)
    }
  }

  context.application.on('chat', listener)
  await context.broadcastMessage(`Quick Trivia: ${trivia.question}`, Color.Good)
  timeout.refresh()

  const wonUser = await timeout.wait()
  context.application.off('chat', listener)

  // eslint-disable-next-line unicorn/prefer-ternary
  if (wonUser === undefined) {
    return {
      message: `The answer is: ${trivia.answerDisplay}. Remember you can only answer once and must be with the letter!`,
      color: Color.Info,
      eventResult: { type: 'ended' }
    }
  } else {
    return {
      message: `Good job ${wonUser.displayName()}!`,
      color: Color.Good,
      eventResult: { type: 'win', user: wonUser }
    }
  }
}

function createQuiz(): { question: string; answerDisplay: string; answerLetter: string } {
  const trivia = TriviaEntries[Math.floor(Math.random() * TriviaEntries.length)]

  let question = trivia.question + '\n'

  const answers = [trivia.correctAnswer, ...trivia.otherAnswers]
  shuffleArrayInPlace(answers)

  for (const [index, answer] of answers.entries()) {
    question += `${IndexLetters[index].toUpperCase()}. ${answer}\n`
  }

  return {
    question: question.trim(),
    answerDisplay: trivia.correctAnswer,
    answerLetter: IndexLetters[answers.indexOf(trivia.correctAnswer)]
  }
}
