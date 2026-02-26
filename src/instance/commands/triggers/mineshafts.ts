import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Mineshafts extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['shafts', 'shaft', 'mineshaft', 'mineshafts', 'corpse', 'corpses'],
      description: 'Returns shaft enter count and corpses looted amount',
      example: `shafts %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const looted = selectedProfile.glacite_player_data?.corpses_looted
    const stats = selectedProfile.glacite_player_data
    if (stats === undefined) {
      return context.app.i18n.t(($) => $['commands.mineshafts.none'], { username: givenUsername })
    }

    return context.app.i18n.t(($) => $['commands.mineshafts.response'], {
      username: givenUsername,
      entered: stats.mineshafts_entered,
      lapis: looted?.lapis ?? 0,
      umber: looted?.umber ?? 0,
      tungsten: looted?.umber ?? 0,
      vanguard: looted?.vanguard ?? 0
    })
  }
}
