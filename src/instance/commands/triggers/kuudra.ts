import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Kuudra extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['kuudra', 'k'],
      description: "Returns a player's kuudra runs",
      example: `kuudra %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const completions = Object.entries({
      basic: selectedProfile.me.crimsonIsle.kuudra.basicCompletions,
      hot: selectedProfile.me.crimsonIsle.kuudra.hotCompletions,
      burning: selectedProfile.me.crimsonIsle.kuudra.burningCompletions,
      fiery: selectedProfile.me.crimsonIsle.kuudra.fieryCompletions,
      infernal: selectedProfile.me.crimsonIsle.kuudra.infernalCompletions
    }).map(([, value]) => value)
    return `${givenUsername}: ${completions.join('/')}`
  }
}
