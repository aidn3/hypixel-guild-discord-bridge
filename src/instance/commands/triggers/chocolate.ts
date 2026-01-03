import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

export default class Chocolate extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['chocolate', 'chocolates', 'cf'],
      description: "Returns a player's skyblock easter eggs chocolate stats",
      example: `chocolate %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const easter = selectedProfile.events?.easter
    const totalChocolate = easter?.total_chocolate ?? 0
    const chocolateSpent = easter?.shop?.chocolate_spent ?? 0
    if (totalChocolate === 0) return `${givenUsername} does not have a chocolate factory.`

    return `${givenUsername} has produced ${shortenNumber(totalChocolate)} chocolate and spent ${shortenNumber(chocolateSpent)}.`
  }
}
