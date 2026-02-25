import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { SkyblockMember } from '../../../core/hypixel/hypixel-skyblock-types'
import { getSelectedSkyblockProfile, getUuidIfExists, usernameNotExists } from '../common/utility'

export default class HeartOfTheMountain extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['hotm', 'powder'],
      description: "Returns a player's hotm and powder",
      example: `hotm %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    const stats = selectedProfile?.mining_core
    if (stats === undefined) {
      return context.app.i18n.t(($) => $['commands.hotm.none'], { username: givenUsername })
    }

    const hotm = this.getHotmLevel(selectedProfile?.skill_tree?.experience?.mining ?? 0)
    const core = selectedProfile?.skill_tree?.nodes.mining?.core_of_the_mountain ?? 0
    const runs = this.getTotalNucleusRuns(stats)
    const mithril = (stats.powder_mithril ?? 0) + (stats.powder_spent_mithril ?? 0)
    const gemstone = (stats.powder_gemstone ?? 0) + (stats.powder_spent_gemstone ?? 0)
    const glacite = (stats.powder_glacite ?? 0) + (stats.powder_spent_glacite ?? 0)

    return context.app.i18n.t(($) => $['commands.hotm.response'], {
      username: givenUsername,
      hotm: hotm,
      core: core,
      runs: runs,
      mithril: mithril,
      gemstone: gemstone,
      glacite: glacite
    })
  }

  private getTotalNucleusRuns(stats: SkyblockMember['mining_core']): number {
    const crystalsPlaced = [
      stats?.crystals?.amber_crystal.total_placed ?? 0,
      stats?.crystals?.jade_crystal.total_placed ?? 0,
      stats?.crystals?.topaz_crystal.total_placed ?? 0,
      stats?.crystals?.sapphire_crystal.total_placed ?? 0,
      stats?.crystals?.amethyst_crystal.total_placed ?? 0
    ]

    return Math.min(...crystalsPlaced)
  }

  private getHotmLevel(xp: number): number {
    const perLevelXP = [
      0, // lvl 1
      3000, // lvl 2
      9000, // lvl 3
      25_000, // lvl 4
      60_000, // lvl 5
      100_000, // lvl 6
      150_000, // lvl 7
      210_000, // lvl 8
      290_000, // lvl 9
      400_000 // lvl 10
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
