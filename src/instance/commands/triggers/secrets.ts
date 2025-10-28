import type { SkyBlockMemberDungeonsMode } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Secrets extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['secrets', 's', 'sec'],
      description: 'Returns how many secrets a player has done',
      example: `secrets %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const catacombRuns = selectedProfile.me.dungeons.catacombs
    const mastermodeRuns = selectedProfile.me.dungeons.masterCatacombs

    const totalRuns = this.getTotalRuns(catacombRuns) + this.getTotalRuns(mastermodeRuns)

    const averageSecrets = (selectedProfile.me.dungeons.secrets / totalRuns).toFixed(2)

    return `${givenUsername}'s secrets: ${selectedProfile.me.dungeons.secrets.toLocaleString()} Total ${averageSecrets} Average`
  }

  private getTotalRuns(runs: SkyBlockMemberDungeonsMode): number {
    // TODO: @Kathund Replace this with the totalCompleted stat that is getting added to reborn
    return (
      (runs.floor0?.timesPlayed ?? 0) +
      runs.floor1.timesPlayed +
      runs.floor2.timesPlayed +
      runs.floor3.timesPlayed +
      runs.floor4.timesPlayed +
      runs.floor5.timesPlayed +
      runs.floor6.timesPlayed +
      runs.floor7.timesPlayed
    )
  }
}
