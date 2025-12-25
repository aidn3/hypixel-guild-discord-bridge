import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverEnteredCrimson,
  playerNeverPlayedSkyblock,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

export default class Crimson extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['crimson', 'nether', 'isle'],
      description: "Returns a player's Crimson Isle stats",
      example: `crimson %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const netherData = selectedProfile.nether_island_player_data
    if (!netherData) return playerNeverEnteredCrimson(givenUsername)

    const faction = netherData.selected_faction ?? 'None'
    const magesRep = netherData.mages_reputation ?? 0
    const barbariansRep = netherData.barbarians_reputation ?? 0

    const kuudraTiers = netherData.kuudra_completed_tiers
    const totalKuudra =
      (kuudraTiers.none ?? 0) +
      (kuudraTiers.hot ?? 0) +
      (kuudraTiers.burning ?? 0) +
      (kuudraTiers.fiery ?? 0) +
      (kuudraTiers.infernal ?? 0)

    return (
      `${givenUsername}'s Crimson Isle: Faction: ${faction} | ` +
      `Mages Rep: ${shortenNumber(magesRep)} | Barbs Rep: ${shortenNumber(barbariansRep)} | ` +
      `Total Kuudra: ${totalKuudra}`
    )
  }
}
