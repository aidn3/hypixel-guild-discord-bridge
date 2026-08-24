import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Sparklings extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'sparklings',
      triggers: ['sparkling', 'sparklings', 'shinys', 'shinies', 'shiny'],
      description: 'Returns caught sparkling critters',
      example: `sparkling %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const safari = selectedProfile.safari

    if (safari == undefined) return context.app.i18n.t(($) => $['commands.safari.none'], { username: givenUsername })

    const uniques = safari.discovered_sparkling_critters?.length ?? 0
    const dupes = (safari.total_captured_sparkling_critters ?? 0) - uniques

    return context.app.i18n.t(($) => $['commands.sparklings.response'], { username: givenUsername, uniques, dupes })
  }
}
