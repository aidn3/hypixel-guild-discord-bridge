import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { capitalize } from '../../../utility/shared-utility'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Essence extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['essence', 'essences', 'ess'],
      description: "Returns a player's Skyblock essence",
      example: `essence %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const essence = selectedProfile.currencies?.essence
    if (essence === undefined) {
      return context.app.i18n.t(($) => $['commands.essence.none'], { username: givenUsername })
    }

    const parts = Object.entries(essence).filter(([, value]) => value.current > 0)
    if (parts.length === 0) {
      return context.app.i18n.t(($) => $['commands.essence.none'], { username: givenUsername })
    }

    const formatted = parts.map(([key, value]) => `${capitalize(key)} ${value.current.toLocaleString('en-US')}`)
    return `${givenUsername} essence: ${formatted.join(' - ')}`
  }
}
