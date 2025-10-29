import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

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

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    let result = `${givenUsername}'s `
    switch (selectedProfile.gameMode) {
      case 'ironman': {
        result += 'ironman profile is level '
        break
      }
      case 'bingo': {
        result += 'bingo profile is level '
        break
      }
      case 'island': {
        result += 'stranded profile is level '
        break
      }
      default: {
        result += 'skyblock profile is level '
      }
    }
    result += `${selectedProfile.me.leveling.level}`

    return result
  }
}
