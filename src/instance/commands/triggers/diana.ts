import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Diana extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['diana', 'mytho', 'mythos', 'mythical'],
      description: "Returns a player's Mythological stats",
      example: `diana %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(context, givenUsername)

    const totalKills = selectedProfile.player_stats?.mythos?.kills ?? 0
    const legendaryChain = selectedProfile.player_stats?.mythos?.burrows_chains_complete?.LEGENDARY ?? 0
    const mythicChain = selectedProfile.player_stats?.mythos?.burrows_chains_complete?.MYTHIC ?? 0

    const inquisitor =
      (selectedProfile.bestiary?.kills.minos_inquisitor_750 ?? 0) +
      (selectedProfile.bestiary?.kills.minos_inquisitor_1250 ?? 0)
    const king = selectedProfile.bestiary?.kills.king_minos_1750 ?? 0
    const manticore = selectedProfile.bestiary?.kills.manticore_1750 ?? 0

    return context.app.i18n.t(($) => $['commands.diana.response'], {
      username: givenUsername,

      legendaryChain: legendaryChain,
      mythicChain: mythicChain,

      totalKills: totalKills,
      inquisitorKills: inquisitor,
      kingKills: king,
      manticoreKills: manticore
    })
  }
}
