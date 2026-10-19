import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  hypixelApiNotSet,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Secrets extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'secrets',
      triggers: ['secrets', 's', 'sec'],
      description: 'Returns how many secrets a player has done',
      example: `secrets %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const hypixel = context.app.hypixel()
    if (hypixel === undefined) return hypixelApiNotSet(context)
    const hypixelProfile = await hypixel.getPlayer(uuid)
    const skyblockProfile = await getSelectedSkyblockProfile(hypixel, uuid)
    if (!skyblockProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const dungeon = skyblockProfile.dungeons?.dungeon_types
    if (!dungeon) return playerNeverPlayedDungeons(givenUsername)

    const catacombRuns = dungeon.catacombs.tier_completions
    const mastermodeRuns = dungeon.master_catacombs?.tier_completions

    const totalRuns = this.getTotalRuns(catacombRuns) + this.getTotalRuns(mastermodeRuns)

    const lifetimeSecrets = hypixelProfile?.achievements?.skyblock_treasure_hunter ?? 0
    const profileSecrets = skyblockProfile.dungeons?.secrets ?? 0
    const averageSecrets = (profileSecrets / totalRuns).toFixed(2)

    return context.app.i18n.t(($) => $['commands.secrets.response'], {
      username: givenUsername,
      lifetimeSecrets,
      profileSecrets,
      averageSecrets
    })
  }

  private getTotalRuns(runs: Record<string, number | undefined> | undefined): number {
    if (runs === undefined) return 0
    return Object.entries(runs)
      .filter(([key]) => key !== 'total')
      .map(([, value]) => value)
      .filter((value) => value !== undefined)
      .reduce((sum, c) => sum + c, 0)
  }
}
