import DefaultAxios from 'axios'
import PromiseQueue from 'promise-queue'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { formatTime } from '../../../utility/shared-utility'

export default class Contests extends ChatCommandHandler {
  private static readonly ContestDuration = Duration.minutes(20)
  private static readonly MaxLife = Duration.hours(6)
  private static readonly Url = 'https://api.elitebot.dev/contests/at/now'

  private readonly singletonPromise = new PromiseQueue(1)
  private result: EliteContests | undefined
  private fetchedAt = -1

  constructor() {
    super({
      triggers: ['contests', 'jacobcontests'],
      description: 'Show current and future Jacob contests',
      example: 'contests'
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const contests = await this.singletonPromise.add(() => this.getContests())
    const sortedContests = Object.entries(contests.contests)
      .map(([time, crops]) => ({ time: Number.parseInt(time, 10) * 1000, crops: crops }))
      .toSorted((a, b) => a.time - b.time)
    const currentTime = Date.now()

    const currentContest = sortedContests.find(
      (contest) => contest.time < currentTime && contest.time + Contests.ContestDuration.toMilliseconds() > currentTime
    )

    const firstNextContest = sortedContests.find((contest) => contest.time > currentTime)
    const secondNextContest = sortedContests.find(
      (contest) => contest.time > currentTime && contest !== firstNextContest
    )
    const thirdNextContest = sortedContests.find(
      (contest) => contest.time > currentTime && contest !== firstNextContest && contest !== secondNextContest
    )

    if (firstNextContest === undefined || secondNextContest === undefined || thirdNextContest === undefined) {
      return context.app.i18n.t(($) => $['commands.contests.unknown'])
    }

    if (currentContest !== undefined) {
      return context.app.i18n.t(($) => $['commands.contests.current'], {
        remainingTime: formatTime(currentContest.time - currentTime + Contests.ContestDuration.toMilliseconds()),
        currentContest: currentContest.crops,

        firstNextTime: formatTime(firstNextContest.time - currentTime),
        firstNextContest: firstNextContest.crops,

        secondNextTime: formatTime(secondNextContest.time - currentTime),
        secondNextContest: secondNextContest.crops
      })
    }

    return context.app.i18n.t(($) => $['commands.contests.future'], {
      firstNextTime: formatTime(firstNextContest.time - currentTime),
      firstNextContest: firstNextContest.crops,

      secondNextTime: formatTime(secondNextContest.time - currentTime),
      secondNextContest: secondNextContest.crops,

      thirdNextTime: formatTime(thirdNextContest.time - currentTime),
      thirdNextContest: thirdNextContest.crops
    })
  }

  private async getContests(): Promise<EliteContests> {
    if (this.result === undefined || this.fetchedAt + Contests.MaxLife.toMilliseconds() < Date.now()) {
      const response = await DefaultAxios.get<EliteContests>(Contests.Url)
      this.result = response.data
      this.fetchedAt = Date.now()
      return response.data
    }

    return this.result
  }
}

interface EliteContests {
  contests: Record<number, string[]>
}
