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
    // TODO: @Kathund rewrite the response from getSkyblockElection coz it's FUCKING SHIT AND I HATE IT AHGUY8FGYUDYFHUGUHFGDHUIDIHJNUVB
    const mayor = await context.app.hypixelApi.getSkyBlockElection()
    if (mayor.isRaw())
      throw new Error("Something wen't wrong while fetching the government of skyblock. Clearly kathund is the mayor")
    if (mayor.currentElection === null) return 'Election booth not opened yet!'

    const candidates = mayor.currentElection.candidates
    const resultsHidden = candidates[0].votesReceived === 0
    if (resultsHidden) {
      return `Hidden Election: ${candidates.map((candidate) => `${candidate.name} ${candidate.perks.length} perks`).join(' | ')}`
    }

    let winner = candidates[0]
    for (const candidate of candidates) {
      if (candidate.votesReceived > winner.votesReceived) winner = candidate
    }

    let minister = candidates.find((candidate) => candidate.name !== winner.name) ?? candidates[1]
    for (const candidate of candidates) {
      if (candidate.name === winner.name) continue
      if (candidate.votesReceived > minister.votesReceived) minister = candidate
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
