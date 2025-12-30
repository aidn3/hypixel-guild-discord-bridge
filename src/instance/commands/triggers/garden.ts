import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Garden extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['garden', 'ga'],
      description: "Returns a player's Garden stats",
      example: `ga %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(context, givenUsername)

    const bestiary = selectedProfile.bestiary?.kills ?? {}
    const totalKilledPests = Object.entries(bestiary)
      .filter(([key]) => key.startsWith('pest_'))
      .map(([, value]) => value as number)
      .reduce((a, b) => a + b, 0)

    // TODO: average crops milestone
    //  Hypixel has changed crops milestone.
    //  Till they are updated in the source, the feature will be left out.
    //  Source: https://wiki.hypixel.net/Garden

    const gardenResponse = await context.app.hypixelApi.getSkyblockGarden(selectedProfile.player_id, { raw: true })
    const uniqueVisitors = Object.values(gardenResponse.garden.commission_data.completed).filter(
      (entry) => entry > 0
    ).length
    return context.app.i18n.t(($) => $['commands.garden.response'], {
      username: givenUsername,
      totalKilledPests: totalKilledPests,
      uniqueVisitors: uniqueVisitors
    })
  }
}
