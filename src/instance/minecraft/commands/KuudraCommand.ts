import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { Client, HypixelSkyblockMemberRaw } from 'hypixel-api-reborn'

enum Kuudra {
  'basic' = 'none',
  'hot' = 'hot',
  'burning' = 'burning',
  'fiery' = 'fiery',
  'infernal' = 'infernal'
}

export default {
  triggers: ['kuudra', 'k'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[1] ?? context.username
    const tier = context.args[0] as keyof typeof Kuudra

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

    const parsedProfile = await getParsedProfile(context.clientInstance.app.hypixelApi, uuid)

    const completions = parsedProfile.nether_island_player_data.kuudra_completed_tiers[Kuudra[tier]]

    return `${givenUsername}: ${tier} - ${completions || 0}`
  }
} satisfies ChatCommandHandler

async function getParsedProfile(hypixelApi: Client, uuid: string): Promise<HypixelSkyblockMemberRaw> {
  return await hypixelApi
    .getSkyblockProfiles(uuid, { raw: true })
    .then((res) => res.profiles.filter((p) => p.selected)[0].members[uuid])
}
