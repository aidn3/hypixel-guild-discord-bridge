import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

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

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const selectedFaction = selectedProfile.me.crimsonIsle.faction
    const mageReputation = selectedProfile.me.crimsonIsle.magesReputation
    const barbarianReputation = selectedProfile.me.crimsonIsle.barbariansReputation

    let message = givenUsername

    // TODO: @Kathund Replace UNKNOWN with None
    // TODO: Requires changes to Hypixel-API-Reborn
    message +=
      selectedFaction === 'UNKNOWN'
        ? ` is not in any faction`
        : ` is in ${selectedFaction.slice(0, 1).toUpperCase() + selectedFaction.slice(1).toLowerCase()} Faction`

    message += ` with Barbarian reputation ${barbarianReputation.toLocaleString('en-US')} - Mages reputation ${mageReputation.toLocaleString('en-US')}`

    return message
  }
}
