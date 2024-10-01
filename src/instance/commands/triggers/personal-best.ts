import { SkyblockV2DungeonsCatacombs } from 'hypixel-api-reborn'
import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/util.js'

export default class Secrets extends ChatCommandHandler {
  constructor() {
    super({
      name: 'PB',
      triggers: ['pb', 'pbr', 'personalbest'],
      description: 'Returns a players best dungeon run time',
      example: `pb m7 %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenFloor = context.args[0] ?? 'm7'
    const givenUsername = context.args[1] ?? context.username
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const hypixelProfile = await context.app.hypixelApi.getPlayer(uuid)
    const skyblockProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!skyblockProfile) return playerNeverPlayedSkyblock(givenUsername)

    const dungeon = skyblockProfile.dungeons?.dungeon_types
    if (!dungeon) return playerNeverPlayedDungeons(givenUsername)

    const dungeonFloor = parseInt(givenFloor.split, 10)

    const dungeonType = 'catacombs'
    if (
      dungeonType === 'catacombs' &&
      !isNaN(dungeonFloor) && dungeonFloor >= 0 && dungeonFloor <= 7
    ) {
      dungeon.catacombs.fastest_time_s[givenFloor]
    }

    const totalRuns = this.getTotalRuns(catacombRuns) + this.getTotalRuns(mastermodeRuns)

    const secrets = hypixelProfile.achievements.skyblockTreasureHunter as number
    const averageSecrets = (secrets / totalRuns).toFixed(2)

    return `${givenUsername}'s secrets: ${secrets.toLocaleString() || 0} Total ${averageSecrets} Average`
  }

  private getTotalRuns(runs: Record<string, number>): number {
    return Object.entries(runs)
      .filter(([key]) => key !== 'total')
      .map(([, value]) => value)
      .reduce((sum, c) => sum + c, 0)
  }
}
