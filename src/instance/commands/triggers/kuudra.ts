import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverEnteredCrimson,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Kuudra extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['kuudra', 'k'],
      description: "Returns a player's kuudra runs",
      example: `kuudra %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (!selectedProfile.nether_island_player_data) return playerNeverEnteredCrimson(givenUsername)
    const tiers = selectedProfile.nether_island_player_data.kuudra_completed_tiers

    const entries: string[] = []
    if (tiers.none) entries.push(`Basic ${tiers.none}`)
    if (tiers.hot) entries.push(`Hot ${tiers.hot}`)
    if (tiers.burning) entries.push(`Burning ${tiers.burning}`)
    if (tiers.fiery) entries.push(`Fiery ${tiers.fiery}`)
    if (tiers.infernal) entries.push(`Infernal ${tiers.infernal}`)

    if (entries.length === 0) return `${givenUsername} has never done Kuudra before?`

    const collection =
      (tiers.none ?? 1) +
      (tiers.hot ?? 0) * 2 +
      (tiers.burning ?? 0) * 3 +
      (tiers.fiery ?? 0) * 4 +
      (tiers.infernal ?? 0) * 5

    return `${givenUsername}: ${entries.join(' - ')} - Collection ${collection.toLocaleString('en-US')}`
  }
}
