import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'
import { getSelectedSkyblockProfileRaw, getUuidIfExists } from '../common/util'

export default class Runs extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Runs',
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
    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    const dungeon = parsedProfile.dungeons.dungeon_types

    const runs = masterMode
      ? this.getTotalRuns(dungeon.master_catacombs.tier_completions)
      : this.getTotalRuns(dungeon.catacombs.tier_completions)
    return `${givenUsername}: ${givenType} - ${runs.join('/')}`
  }

  private getTotalRuns(runs: Record<string, number>): number[] {
    return Object.entries(runs)
      .filter(([key]) => key !== 'total')
      .map(([, value]) => value)
  }
}
