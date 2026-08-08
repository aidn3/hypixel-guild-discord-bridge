import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { Slayer as SlayerType } from '../../../core/hypixel/hypixel-skyblock'
import { getSlayerLevel, SlayerHighestTierTable } from '../../../core/hypixel/hypixel-skyblock'
import { capitalize } from '../../../utility/shared-utility'
import {
  getSelectedSkyblockProfile,
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

export default class Slayer extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'slayer',
      triggers: ['slayer', 'slayers', 'sl', 'slyr'],
      description: "Returns a player's slayer level",
      example: `slayer %s eman`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const givenSlayer = context.args[1] ?? 'overview'

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
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
      const typedName = name as 'zombie' | 'spider' | 'wolf' | 'enderman' | 'blaze' | 'vampire'
      if (name === chosenSlayer) {
        return (
          `${givenUsername}'s ${capitalize(chosenSlayer)} slayer: ` +
          `Level ${getSlayerLevel(slayer.xp ?? 0, typedName)} - ${(slayer.xp ?? 0).toLocaleString()} XP - ` +
          `Highest tier kills: ${this.getHighestTierKills(slayer, name).toLocaleString()}`
        )
      }
    }

    const output: string[] = []
    for (const [name, slayer] of Object.entries(slayerBosses)) {
      const typedName = name as 'zombie' | 'spider' | 'wolf' | 'enderman' | 'blaze' | 'vampire'
      output.push(`${capitalize(name)} ${getSlayerLevel(slayer.xp ?? 0, typedName)}`)
    }
    return `${givenUsername}'s slayers: ${output.join(' - ')}`
  }

  private getHighestTierKills(slayerData: SlayerType, slayerName: string): number {
    const highestTier = SlayerHighestTierTable[slayerName as keyof typeof SlayerHighestTierTable]
    const index = `boss_kills_tier_${highestTier}`
    return slayerData[index as keyof SlayerType] ?? 0
  }
}
