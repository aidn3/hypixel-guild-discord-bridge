import type { SkyBlockMemberDungeonsMode } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Runs extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['runs', 'r'],
      description: 'Returns how many dungeon runs a player has done',
      example: `runs mm %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenType = context.args[0]?.toLowerCase() ?? 'cata'
    const givenUsername = context.args[1] ?? context.username

    let masterMode = false
    if (givenType == 'cata' || givenType === 'catacombs') {
      masterMode = false
    } else if (givenType === 'mm' || givenType === 'mastermode') {
      masterMode = true
    } else {
      return `${context.username}, invalid type. can be 'cata'/'mm' but not '${givenType}'`
    }

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const runs = masterMode
      ? this.getTotalRuns(selectedProfile.me.dungeons.masterCatacombs)
      : this.getTotalRuns(selectedProfile.me.dungeons.catacombs)
    if (runs.length === 0) return `${givenUsername}: ${givenType} - never done runs in this type before?`

    return `${givenUsername}: ${givenType} - ${runs.join('/')}`
  }

  private getTotalRuns(runs: SkyBlockMemberDungeonsMode): number[] {
    return [
      runs.floor0?.timesPlayed ?? 0,
      runs.floor1.timesPlayed,
      runs.floor2.timesPlayed,
      runs.floor3.timesPlayed,
      runs.floor4.timesPlayed,
      runs.floor5.timesPlayed,
      runs.floor6.timesPlayed,
      runs.floor7.timesPlayed
    ]
  }
}
