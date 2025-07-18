import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Election extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['election'],
      description: 'Show current Hypixel Skyblock Election',
      example: `election`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const mayor = await context.app.hypixelApi.getSkyblockGovernment({ raw: true })
    if (mayor.current === undefined) return 'Election booth not opened yet!'

    const candidates = mayor.current.candidates
    const resultsHidden = candidates[0].votes === undefined
    if (resultsHidden) {
      return `Hidden Election: ${candidates.map((candidate) => `${candidate.name} ${candidate.perks.length} perks`).join(' | ')}`
    }

    let winner = candidates[0]
    for (const candidate of candidates) {
      assert.ok(candidate.votes !== undefined)
      assert.ok(winner.votes !== undefined)
      if (candidate.votes > winner.votes) winner = candidate
    }

    let minister = candidates.find((candidate) => candidate.name !== winner.name)
    assert.ok(minister !== undefined)
    for (const candidate of candidates) {
      if (candidate.name === winner.name) continue

      assert.ok(candidate.votes !== undefined)
      assert.ok(minister.votes !== undefined)
      if (candidate.votes > minister.votes) minister = candidate
    }

    let message = `Upcoming election: `
    message += `${winner.name} (${winner.perks.map((perk) => perk.name).join(', ')})`
    message += ' | '
    message += `${minister.name} (${minister.perks
      .filter((perk) => perk.minister)
      .map((perk) => perk.name)
      .join(', ')})`
    return message
  }
}
