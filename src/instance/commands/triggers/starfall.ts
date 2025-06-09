import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatTime } from '../../../util/shared-util.js'

export default class Starfall extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Starfall',
      triggers: ['starfall', 'star', 'sf'],
      description: 'When is the next Skyblock Starfall event',
      example: `starfall`
    })
  }

  handler(context: ChatCommandContext): string {
    const HourInMillisecond = 50_000
    const DayInMilliseconds = 24 * HourInMillisecond
    const MonthInMillisecond = 31 * DayInMilliseconds
    const Year0 = 1_560_275_700_000

    const StarfallDays = new Set([7, 14, 21, 28])

    const currentTime = Date.now()
    const currentEpoch = currentTime - Year0
    const currentDay = (currentEpoch % MonthInMillisecond) / DayInMilliseconds + 1
    const currentHour = (currentEpoch % DayInMilliseconds) / HourInMillisecond

    if (StarfallDays.has(Math.floor(currentDay)) && currentHour < 6) {
      return `${context.username}, Cult of the Fallen Star is here. Get that free x200 starfall!`
    }

    let timeTillStarfall = 0

    const dayProgress = currentDay - Math.floor(currentDay)
    timeTillStarfall += (1 - dayProgress) * DayInMilliseconds

    let day = Math.floor(currentDay) + 1 // 1 day added from the dayProgress
    while (!StarfallDays.has(day)) {
      if (day === 31) day = 0
      day++
      timeTillStarfall += DayInMilliseconds
    }

    return `${context.username}, Cult of the Fallen Star is starting in ${formatTime(timeTillStarfall)}.`
  }
}
