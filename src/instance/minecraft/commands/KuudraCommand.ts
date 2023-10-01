import { KuudraTier } from 'hypixel-api-reborn'
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

const Kuudra: Record<KuudraTier, string[]> = {
  none: ['basic', 't1', '1'],
  hot: ['hot', 't2', '2'],
  burning: ['burning', 't3', '3'],
  fiery: ['fiery', 't4', '4'],
  infernal: ['infernal', 't5', '5']
}

export default {
  triggers: ['kuudra', 'k'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
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

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => null)

    if (uuid == null) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await context.clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((res) => res.profiles.filter((p) => p.selected)[0].members[uuid])

    const completions = parsedProfile.nether_island_player_data.kuudra_completed_tiers[chosenTier] || 0

    return `${givenUsername}: ${givenTier} - ${completions}`
  }
} satisfies ChatCommandHandler
