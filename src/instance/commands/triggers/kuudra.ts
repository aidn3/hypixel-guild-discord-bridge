import assert from 'node:assert'

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getUuidIfExists } from '../common/util.js'

export default class Kuudra extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Kuudra',
      triggers: ['kuudra', 'k'],
      description: "Returns a player's kuudra runs",
      example: `kuudra %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles.find((p) => p.selected)?.members[uuid])
    assert(parsedProfile)

    const tiers = parsedProfile.nether_island_player_data.kuudra_completed_tiers

    const completions = Object.entries(tiers)
      .filter(([key]) => !key.startsWith('highest_wave'))
      .map(([, value]) => value)
    return `${givenUsername}: ${completions.join('/')}`
  }
}
