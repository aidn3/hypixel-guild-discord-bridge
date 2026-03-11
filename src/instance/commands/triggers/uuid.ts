import DefaultAxios from 'axios'
import NodeCache from 'node-cache'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { usernameNotExists } from '../common/utility'

export default class Uuid extends ChatCommandHandler {
  private readonly cache = new NodeCache({ stdTTL: Duration.hours(12).toMilliseconds() })

  constructor() {
    super({
      triggers: ['username', 'name', 'ign', 'uuid'],
      description: 'Show the Mojang uuid of a player',
      example: 'uuid %s'
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const profile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (profile == undefined) return usernameNotExists(context, givenUsername)

    const history = await this.getHistory(context, profile.id).catch(() => undefined)
    if (history === undefined || history.length <= 1) {
      return `${profile.id}: ${profile.name}`
    }

    const sortedHistory = history.toReversed().slice(0, 5)
    const historyResult: string[] = []
    for (const entry of sortedHistory) {
      if (entry.changed_at) {
        const date = new Date(entry.changed_at)
        const formattedDate = `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`
        historyResult.push(`${entry.name} ${formattedDate}`)
      } else {
        historyResult.push(entry.name)
      }
    }

    if (sortedHistory[0].name !== profile.name) {
      historyResult.unshift(profile.name)
    }

    return `${profile.id}: ${historyResult.join(' - ')}`
  }

  private async getHistory(context: ChatCommandContext, uuid: string): Promise<HistorySuccess['history']> {
    if (!context.app.core.commandsConfigurations.getUsernameHistoryEnabled()) return []

    const cachedResult = this.cache.get<HistorySuccess['history']>(uuid)
    if (cachedResult !== undefined) return cachedResult

    const result = await DefaultAxios.get<HistorySuccess>('https://liforra.de/api/namehistory', {
      params: { uuid }
    }).then((response) => response.data.history)

    this.cache.set(uuid, result)
    return result
  }
}

interface HistorySuccess {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  history: { name: string; changed_at: string | null }[]
}
