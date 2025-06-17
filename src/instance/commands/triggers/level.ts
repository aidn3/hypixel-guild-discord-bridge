import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/util.js'

export default class Level extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['level', 'lvl', 'l'],
      description: "Returns a player's skyblock level",
      example: `lvl %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const exp = selectedProfile.leveling?.experience ?? 0
    return `${givenUsername}'s level: ${(exp / 100).toFixed(2)}`
  }
}
