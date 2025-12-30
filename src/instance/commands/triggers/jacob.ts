import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Jacob extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['jacob', 'jacobs', 'jacobcontents', 'jacobcontest'],
      description: "Returns a player's skyblock Jacob contest stats",
      example: `jacob %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const jacob = selectedProfile.jacobs_contest
    const farmingLevelCap = jacob?.perks?.farming_level_cap ?? 0
    const doubleDrops = jacob?.perks?.double_drops ?? 0
    const goldMedals = jacob?.unique_brackets.gold.length ?? 0
    const diamondMedals = jacob?.unique_brackets.diamond.length ?? 0
    const platinumMedals = jacob?.unique_brackets.diamond.length ?? 0

    return context.app.i18n.t(($) => $['commands.jacob.response'], {
      username: givenUsername,
      platinum: platinumMedals,
      diamond: diamondMedals,
      gold: goldMedals,
      farmingCap: farmingLevelCap,
      doubleDrops: doubleDrops
    })
  }
}
