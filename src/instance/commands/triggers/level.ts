import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getSelectedSkyblockProfileRaw, getUuidIfExists } from '../common/util.js'

export default class Level extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Level',
      triggers: ['level', 'lvl', 'l'],
      description: "Returns a player's skyblock level",
      example: `lvl %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const profile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    const exp = profile.leveling?.experience ?? 0
    return `${givenUsername}'s level: ${(exp / 100).toFixed(2)}`
  }
}
