import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

enum Kuudra {
  'basic' = 'none',
  'hot' = 'hot',
  'burning' = 'burning',
  'fiery' = 'fiery',
  'infernal' = 'infernal',
  't1' = 'none',
  't2' = 'hot',
  't3' = 'burning',
  't4' = 'fiery',
  't5' = 'infernal'
}

export default {
  triggers: ['kuudra', 'k'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const tier = context.args[0]?.toLowerCase() as keyof typeof Kuudra
    const givenUsername = context.args[1] ?? context.username

    if (!Object.keys(Kuudra).includes(tier)) {
      return `${context.username}, Invalid tier! (given: ${tier})`
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

    const completions = parsedProfile.nether_island_player_data.kuudra_completed_tiers[Kuudra[tier]]

    return `${givenUsername}: ${tier} - ${completions || 0}`
  }
} satisfies ChatCommandHandler
