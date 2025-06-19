import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverEnteredCrimson,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/util.js'

export default class Reputation extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['rep', 'reputation', 'faction'],
      description: "Returns a player's crimson isle's faction reputation",
      example: `rep %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    if (
      selectedProfile.nether_island_player_data === undefined ||
      !('selected_faction' in selectedProfile.nether_island_player_data)
    ) {
      return playerNeverEnteredCrimson(givenUsername)
    }

    const selectedFaction: string | undefined = selectedProfile.nether_island_player_data.selected_faction
    const mageReputation: number | undefined = selectedProfile.nether_island_player_data.mages_reputation
    const barbarianReputation: number | undefined = selectedProfile.nether_island_player_data.barbarians_reputation

    let message = givenUsername

    message +=
      selectedFaction === undefined
        ? ` is not in any faction`
        : ` is in ${selectedFaction.slice(0, 1).toUpperCase() + selectedFaction.slice(1).toLowerCase()} Faction`

    const reputations: string[] = []
    if (barbarianReputation !== undefined) {
      reputations.push(`Barbarian reputation ${barbarianReputation.toLocaleString('en-US')}`)
    }
    if (mageReputation !== undefined) {
      reputations.push(`Mages reputation ${mageReputation.toLocaleString('en-US')}`)
    }
    if (reputations.length > 0) {
      message += ` with ${reputations.join(' - ')}`
    }

    return message
  }
}
