import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedDungeons,
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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const dungeon = selectedProfile.dungeons?.dungeon_types
    if (!dungeon) {
      return playerNeverPlayedDungeons(givenUsername)
    }

    const runs = masterMode
      ? this.getTotalRuns(dungeon.master_catacombs.tier_completions)
      : this.getTotalRuns(dungeon.catacombs.tier_completions)
    if (runs.length === 0) return `${givenUsername}: ${givenType} - never done runs in this type before?`

    return `${givenUsername}: ${givenType} - ${runs.join('/')}`
  }

  private getTotalRuns(runs: Record<string, number | undefined> | undefined): number[] {
    if (runs === undefined) return []
    return Object.entries(runs)
      .filter(([key]) => key !== 'total')
      .map(([, value]) => value)
      .filter((value) => value !== undefined)
  }
}
