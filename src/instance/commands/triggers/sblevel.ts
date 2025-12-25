import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Sblevel extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['sblevel', 'sblvl'],
      description: "Returns a player's Skyblock level",
      example: `sblevel %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const experience = selectedProfile.leveling?.experience ?? 0
    const level = experience > 0 ? experience / 100 : 0

    return `${givenUsername}'s Skyblock Level: ${level.toFixed(2)}`
  }
}
