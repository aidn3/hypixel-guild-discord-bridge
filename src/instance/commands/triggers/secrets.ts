import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'
import { getSelectedSkyblockProfileRaw, getUuidIfExists } from '../common/util'

export default class Secrets extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Secrets',
      triggers: ['secrets', 's', 'sec'],
      description: 'Returns how many secrets a player has done',
      example: `secrets %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const hypixelProfile = await context.app.hypixelApi.getPlayer(uuid)
    const skyblockProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)

    const catacombRuns = skyblockProfile.dungeons.dungeon_types.catacombs.tier_completions
    const mastermodeRuns = skyblockProfile.dungeons.dungeon_types.master_catacombs.tier_completions

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
