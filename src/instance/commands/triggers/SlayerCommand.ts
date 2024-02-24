import assert from 'node:assert'
import type { Slayer } from 'hypixel-api-reborn'
import type { ChatCommandContext } from '../common/CommandInterface'
import { ChatCommandHandler } from '../common/CommandInterface'

const Slayers: Record<string, string[]> = {
  zombie: ['revenant', 'rev', 'zombie'],
  spider: ['tarantula', 'tara', 'spider', 'tar'],
  wolf: ['sven', 'wolf'],
  enderman: ['voidgloom', 'eman', 'enderman'],
  blaze: ['inferno', 'demonlord', 'blaze'],
  vampire: ['riftstalker', 'bloodfiend', 'vamp', 'vampire'],
  overview: ['all', 'summary']
}
const slayerExpTable = {
  1: 5,
  2: 15,
  3: 200,
  4: 1000,
  5: 5000,
  6: 20_000,
  7: 100_000,
  8: 400_000,
  9: 1_000_000
}
const vampExpTable = {
  1: 20,
  2: 75,
  3: 240,
  4: 840,
  5: 2400
}

const highestTierTable = {
  // 1 less due to index starting at 0
  zombie: 4,
  spider: 3,
  wolf: 3,
  enderman: 3,
  blaze: 3,
  vampire: 4
}

export default class SlayerCommand extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Slayers',
      triggers: ['slayer', 'sl', 'slyr'],
      description: "Returns a player's slayer level",
      example: `slayer eman %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenSlayer = context.args[0] ?? 'overview'
    const givenUsername = context.args[1] ?? context.username

    const uuid = await context.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const slayersProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles)
      .then((profiles) => profiles.find((p) => p.selected))
      .then((response) => response?.members[uuid].slayer_bosses)
    assert(slayersProfile)

    let chosenSlayer: string | undefined
    for (const [key, names] of Object.entries(Slayers)) {
      if (names.includes(givenSlayer.toLowerCase())) {
        chosenSlayer = key
      }
    }

    for (const [name, slayer] of Object.entries(slayersProfile)) {
      if (name === chosenSlayer) {
        return (
          `${givenUsername}'s ${chosenSlayer} slayer: ` +
          `Level ${this.getSlayerLevel(slayer.xp, name)} (${slayer.xp.toLocaleString()}) ` +
          `Highest tier kills: ${this.getHighestTierKills(slayer, name).toLocaleString()}`
        )
      }
    }

    let output = '/'
    for (const [name, slayer] of Object.entries(slayersProfile)) {
      output += this.getSlayerLevel(slayer.xp, name) + '/'
    }
    return `${givenUsername}'s slayers: ${output}`
  }

  private getSlayerLevel(exp: number, slayer: string): number {
    let maxLevel
    let expTable

    if (slayer === 'vampire') {
      maxLevel = 5 // vampire slayer only goes to level 5
      expTable = vampExpTable
    } else {
      maxLevel = 9
      expTable = slayerExpTable
    }

    let level = 0
    for (let x = 1; x <= maxLevel && expTable[x as keyof typeof expTable] <= exp; x++) {
      level = x
    }
    return level
  }

  private getHighestTierKills(slayerData: Slayer, slayerName: string): number {
    const highestTier = highestTierTable[slayerName as keyof typeof highestTierTable]
    const index = 'boss_kills_tier_' + highestTier
    return slayerData[index as keyof Slayer] ?? 0
  }
}
