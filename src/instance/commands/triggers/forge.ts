import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getForgeItems } from '../common/forge'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Forge extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['forge'],
      description: "Returns a player's forge items",
      example: `forge %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const forgeItems = getForgeItems(selectedProfile)
    if (forgeItems == undefined) {
      return `${givenUsername} has never gone to the Dwarven Mines on this profile.`
    }
    if (forgeItems.length === 0) return `${givenUsername} has no items in their forge.`

    const formatted = forgeItems
      .sort((a, b) => a.slot - b.slot)
      .map((item) => `${item.slot}: ${item.name}${item.timeFinishedText}`)

    return `${givenUsername}'s Forge: ${formatted.join(' | ')}`
  }
}
