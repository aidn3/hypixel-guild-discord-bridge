import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Agatha extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['agatha', 'agathabests', 'agathapbs', 'foragingpbs'],
      description: "Returns a player's Agatha and foraging personal bests",
      example: `agatha %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const personalBests = selectedProfile.foraging?.starlyn?.personal_bests

    if (personalBests === undefined) {
      return context.app.i18n.t(($) => $['commands.agatha.none'], { username: givenUsername })
    }

    const agatha = personalBests.agatha ?? 0
    const fig = personalBests.FIG_LOG ?? 0
    const mangrove = personalBests.MANGROVE_LOG ?? 0

    return context.app.i18n.t(($) => $['commands.agatha.response'], {
      username: givenUsername,
      agatha,
      fig,
      mangrove
    })
  }
}
