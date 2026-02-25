import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getSelectedSkyblockProfile, getUuidIfExists, usernameNotExists } from '../common/utility.js'

export default class HeartOfTheMountain extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['hotf', 'forest', 'whispers'],
      description: "Returns a player's hotf and whispers",
      example: `hotf %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    const foragingExperince = selectedProfile?.skill_tree?.experience?.foraging

    if (foragingExperince === undefined) {
      return context.app.i18n.t(($) => $['commands.hotf.none'], { username: givenUsername })
    }
    const whispers =
      (selectedProfile?.foraging_core?.forests_whispers ?? 0) +
      (selectedProfile?.foraging_core?.forests_whispers_spent ?? 0)
    const hotf = this.getHotfLevel(foragingExperince)
    const centerOfTheForest = selectedProfile?.skill_tree?.nodes.foraging?.center_of_the_forest ?? 0

    return context.app.i18n.t(($) => $['commands.hotf.response'], {
      username: givenUsername,
      hotf: hotf,
      whispers: whispers,
      cotf: centerOfTheForest
    })
  }

  private getHotfLevel(xp: number): number {
    const perLevelXP = [
      0, // lvl 1
      3000, // lvl 2
      9000, // lvl 3
      25_000, // lvl 4
      60_000, // lvl 5
      100_000, // lvl 6
      150_000 // lvl 7
    ]

    const cumulative: number[] = []
    let total = 0

    for (const value of perLevelXP) {
      total += value
      cumulative.push(total)
    }

    let level = 1

    for (const [index, element] of cumulative.entries()) {
      if (xp >= element) {
        level = index + 1
      } else {
        break
      }
    }

    if (level >= cumulative.length) {
      return cumulative.length
    }

    const currentXP = cumulative[level - 1]
    const nextXP = cumulative[level]

    const progress = (xp - currentXP) / (nextXP - currentXP)

    return Number((level + progress).toFixed(2))
  }
}
