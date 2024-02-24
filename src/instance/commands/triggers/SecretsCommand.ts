import assert from 'node:assert'
import { ChatCommandContext, ChatCommandHandler } from '../common/CommandInterface'

export default class SecretsCommand extends ChatCommandHandler {
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

    const uuid = await context.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const hypixelProfile = await context.app.hypixelApi.getPlayer(uuid)
    assert(hypixelProfile)

    const dungeons = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles)
      .then((profiles) => profiles.find((p) => p.selected))
      .then((response) => response?.members[uuid].dungeons)
    assert(dungeons)

    const catacombRuns = dungeons.dungeon_types.catacombs.tier_completions
    const mastermodeRuns = dungeons.dungeon_types.master_catacombs.tier_completions

    const totalCatacombs = Object.values(catacombRuns).reduce((sum, c) => sum + c, 0)
    const totalMastermode = Object.values(mastermodeRuns).reduce((sum, c) => sum + c, 0)

    const totalRuns = totalCatacombs + totalMastermode

    const secrets = hypixelProfile.achievements.skyblockTreasureHunter as number

    const averageSecrets = (secrets / totalRuns).toFixed(2)

    return `${givenUsername}'s secrets: ${secrets.toLocaleString() || 0} Total ${averageSecrets} Average`
  }
}
