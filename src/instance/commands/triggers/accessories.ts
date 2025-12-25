import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

export default class Accessories extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['accessories', 'acc', 'talismans', 'talisman'],
      description: "Returns a player's accessory bag stats",
      example: `acc %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const accessoryStorage = selectedProfile.accessory_bag_storage
    if (!accessoryStorage) return `${givenUsername} has no accessory data or API is off.`

    const magicalPower = accessoryStorage.highest_magical_power

    const selectedPower = accessoryStorage.selected_power ?? 'None'

    // Get tuning stats if available
    const tuning = accessoryStorage.tuning.slot_0
    const tuningStats: string[] = []
    if (tuning) {
      for (const [stat, value] of Object.entries(tuning)) {
        if (value > 0) {
          tuningStats.push(`${stat}: ${value}`)
        }
      }
    }

    const tuningDisplay = tuningStats.length > 0 ? tuningStats.join(', ') : 'None'

    return (
      `${givenUsername}'s Accessories: ${shortenNumber(magicalPower)} MP | ` +
      `Power: ${selectedPower} | Tuning: ${tuningDisplay}`
    )
  }
}
