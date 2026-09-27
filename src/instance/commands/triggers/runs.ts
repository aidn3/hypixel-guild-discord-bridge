import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Runs extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'runs',
      triggers: ['runs', 'r'],
      description: 'Returns how many dungeon runs a player has done',
      example: `runs %s mm`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const givenType = context.args[1]?.toLowerCase() ?? 'cata'

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

    if (masterMode) {
      return context.app.i18n.t(($) => $['commands.runs.response-mastermode'], {
        username: givenUsername,
        m1: dungeon.master_catacombs?.tier_completions?.['1'] ?? 0,
        m2: dungeon.master_catacombs?.tier_completions?.['2'] ?? 0,
        m3: dungeon.master_catacombs?.tier_completions?.['3'] ?? 0,
        m4: dungeon.master_catacombs?.tier_completions?.['4'] ?? 0,
        m5: dungeon.master_catacombs?.tier_completions?.['5'] ?? 0,
        m6: dungeon.master_catacombs?.tier_completions?.['6'] ?? 0,
        m7: dungeon.master_catacombs?.tier_completions?.['7'] ?? 0
      })
    }

    return context.app.i18n.t(($) => $['commands.runs.response-normal'], {
      username: givenUsername,
      f0: dungeon.catacombs.tier_completions?.['0'] ?? 0,
      f1: dungeon.catacombs.tier_completions?.['1'] ?? 0,
      f2: dungeon.catacombs.tier_completions?.['2'] ?? 0,
      f3: dungeon.catacombs.tier_completions?.['3'] ?? 0,
      f4: dungeon.catacombs.tier_completions?.['4'] ?? 0,
      f5: dungeon.catacombs.tier_completions?.['5'] ?? 0,
      f6: dungeon.catacombs.tier_completions?.['6'] ?? 0,
      f7: dungeon.catacombs.tier_completions?.['7'] ?? 0
    })
  }
}
