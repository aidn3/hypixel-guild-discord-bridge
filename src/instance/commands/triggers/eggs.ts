import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
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
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const totalChocolate = selectedProfile.me.chocolateFactory.totalChocolate
    // TODO: @Kathund this shit doesn't exist in reborn
    const chocolateSpent = selectedProfile.me.chocolateFactory.chocolateSincePrestige - totalChocolate
    if (totalChocolate === 0) return `${givenUsername} does not have a chocolate factory.`

    return `${givenUsername} has produced ${shortenNumber(totalChocolate)} chocolate and spent ${shortenNumber(chocolateSpent)}.`
  }
}
