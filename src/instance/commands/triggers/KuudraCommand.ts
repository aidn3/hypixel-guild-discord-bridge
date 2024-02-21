import * as assert from 'node:assert'
import { KuudraTier } from 'hypixel-api-reborn'
import { ChatCommandContext, ChatCommandHandler } from '../Common'

const Kuudra: Record<KuudraTier, string[]> = {
  none: ['basic', 't1', '1'],
  hot: ['hot', 't2', '2'],
  burning: ['burning', 't3', '3'],
  fiery: ['fiery', 't4', '4'],
  infernal: ['infernal', 't5', '5']
}

export default class KuudraCommand extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Kuudra',
      triggers: ['kuudra', 'k'],
      description: "Returns a player's kuudra runs",
      example: `kuudra t5 %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenTier = context.args[0]?.toLowerCase()
    const givenUsername = context.args[1] ?? context.username

    let chosenTier: KuudraTier | undefined
    for (const [key, names] of Object.entries(Kuudra)) {
      if (names.includes(givenTier.toLowerCase())) {
        chosenTier = key as KuudraTier
      }
    }
    if (chosenTier === undefined) {
      return `${context.username}, Invalid Tier! (given: ${givenTier})`
    }

    const uuid = await context.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles.find((p) => p.selected)?.members[uuid])
    assert(parsedProfile)

    const completions = parsedProfile.nether_island_player_data.kuudra_completed_tiers[chosenTier] || 0

    return `${givenUsername}: ${givenTier} - ${completions}`
  }
}
