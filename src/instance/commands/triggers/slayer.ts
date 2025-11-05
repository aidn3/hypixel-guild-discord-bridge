import type { Slayer as SlayerType } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  capitalize,
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  playerNeverPlayedSlayers,
  usernameNotExists
} from '../common/utility'

const Slayers: Record<string, string[]> = {
  zombie: ['revenant', 'rev', 'zombie'],
  spider: ['tarantula', 'tara', 'spider', 'tar'],
  wolf: ['sven', 'wolf'],
  enderman: ['voidgloom', 'eman', 'enderman'],
  blaze: ['inferno', 'demonlord', 'blaze'],
  vampire: ['riftstalker', 'bloodfiend', 'vamp', 'vampire'],
  overview: ['all', 'summary']
}
const SlayerExpTable = {
  /* eslint-disable @typescript-eslint/naming-convention */
  1: 5,
  2: 15,
  3: 200,
  4: 1000,
  5: 5000,
  6: 20_000,
  7: 100_000,
  8: 400_000,
  9: 1_000_000
  /* eslint-enable @typescript-eslint/naming-convention */
}
const VampExpTable = {
  /* eslint-disable @typescript-eslint/naming-convention */
  1: 20,
  2: 75,
  3: 240,
  4: 840,
  5: 2400
  /* eslint-enable @typescript-eslint/naming-convention */
}

const HighestTierTable = {
  // 1 less due to index starting at 0
  zombie: 4,
  spider: 4,
  wolf: 3,
  enderman: 3,
  blaze: 3,
  vampire: 4
}

export default class Slayer extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['slayer', 'sl', 'slyr'],
      description: "Returns a player's slayer level",
      example: `slayer eman %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const givenSlayer = context.args[1] ?? 'overview'

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const slayerBosses = selectedProfile.slayer?.slayer_bosses
    if (!slayerBosses) return playerNeverPlayedSlayers(givenUsername)

    let chosenSlayer: string | undefined
    for (const [key, names] of Object.entries(Slayers)) {
      if (names.includes(givenSlayer.toLowerCase())) {
        chosenSlayer = key
      }
    }

    for (const [name, slayer] of Object.entries(slayerBosses)) {
      if (name === chosenSlayer) {
        return (
          `${givenUsername}'s ${capitalize(chosenSlayer)} slayer: ` +
          `Level ${this.getSlayerLevel(slayer.xp, name)} - ${slayer.xp.toLocaleString()} XP - ` +
          `Highest tier kills: ${this.getHighestTierKills(slayer, name).toLocaleString()}`
        )
      }
    }

    const output: string[] = []
    for (const [name, slayer] of Object.entries(slayerBosses)) {
      output.push(`${capitalize(name)} ${this.getSlayerLevel(slayer.xp, name)}`)
    }
    return `${givenUsername}'s slayers: ${output.join(' - ')}`
  }

  private getSlayerLevel(exp: number, slayer: string): number {
    let maxLevel: number
    let expTable: Record<number, number>

    if (slayer === 'vampire') {
      maxLevel = 5 // vampire slayer only goes to level 5
      expTable = VampExpTable
    } else {
      maxLevel = 9
      expTable = SlayerExpTable
    }

    let level = 0
    for (let x = 1; x <= maxLevel && expTable[x] <= exp; x++) {
      level = x
    }
    return level
  }

  private getHighestTierKills(slayerData: SlayerType, slayerName: string): number {
    const highestTier = HighestTierTable[slayerName as keyof typeof HighestTierTable]
    const index = `boss_kills_tier_${highestTier}`
    return slayerData[index as keyof SlayerType] ?? 0
  }
}
