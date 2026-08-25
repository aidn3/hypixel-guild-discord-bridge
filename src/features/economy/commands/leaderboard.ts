import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { shortenNumber } from '../../../utility/shared-utility.js'
import type { EconomyDatabase } from '../economy-database.js'

import { resolveAmount } from './common/common.js'

export default class Leaderboard extends ChatCommandHandler {
  private static readonly EntriesPerPage = 5
  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'economy-leaderboard',
      triggers: ['leaderboard', 'lb', 'auralb', 'lbaura', 'auraleaderboard'],
      description: 'Returns aura leaderboard',
      example: `aura 2`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenPage = context.args.at(0)
    let page = 1
    if (givenPage !== undefined) {
      const resolvedAmount = resolveAmount(context, givenPage)
      if (typeof resolvedAmount === 'string' || resolvedAmount <= 0) return `${context.username}, invalid page.`
      page = resolvedAmount
    }

    const leaderboard = await this.database.getLeaderboard()
    if (leaderboard.size === 0) return `${context.username}, no one has any aura to display`

    const sortedLeaderboard = leaderboard
      .entries()
      .map(([userId, value]) => ({ userId, value }))
      .toArray()
      .toSorted((a, b) => b.value - a.value)
      .slice(Leaderboard.EntriesPerPage * (page - 1), Leaderboard.EntriesPerPage * page)
    if (sortedLeaderboard.length === 0) {
      return `${context.username}, can only go up to page ${Math.ceil(leaderboard.size / Leaderboard.EntriesPerPage)}`
    }

    const result: string[] = []
    for (const [index, entry] of sortedLeaderboard.entries()) {
      let line = `- ${index + 1 + (page - 1) * Leaderboard.EntriesPerPage}. `

      const identifier = context.app.core.users.getUserIdentifier(entry.userId)
      if (identifier === undefined) {
        line += `${entry.userId} `
      } else {
        const user = await context.app.core.initializeUser(identifier, { guild: undefined })
        line += `${user.displayName()} `
      }

      line += shortenNumber(entry.value)
      result.push(line)
    }

    return `Leaderboard: \n${result.join('\n')}`
  }
}
