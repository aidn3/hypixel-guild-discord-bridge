import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

export default class Eggs extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['eggs', 'egg'],
      description: "Returns a player's skyblock easter eggs stats",
      example: `eggs %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const easter = selectedProfile.events?.easter
    const totalChocolate = easter?.total_chocolate ?? 0
    const chocolateSpent = easter?.shop?.chocolate_spent ?? 0
    if (totalChocolate === 0) return `${givenUsername} does not have a chocolate factory.`

    return `${givenUsername} has produced ${shortenNumber(totalChocolate)} chocolate and spent ${shortenNumber(chocolateSpent)}.`
  }
}
