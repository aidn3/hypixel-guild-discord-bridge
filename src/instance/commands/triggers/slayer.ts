import type { SkyBlockMemberSlayer } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
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
      triggers: ['slayer', 'sl', 'slyr'],
      description: "Returns a player's slayer level",
      example: `slayer eman %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const givenSlayer = context.args[1] ?? 'overview'

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const slayerBosses = selectedProfile.me.slayers

    let chosenSlayer: string | undefined
    for (const [key, names] of Object.entries(Slayers)) {
      if (names.includes(givenSlayer.toLowerCase())) {
        chosenSlayer = key
      }
    }

    for (const [name, slayerData] of Object.entries({
      zombie: slayerBosses.zombie,
      spider: slayerBosses.spider,
      wolf: slayerBosses.wolf,
      enderman: slayerBosses.enderman,
      blaze: slayerBosses.blaze,
      vampire: slayerBosses.vampire
    })) {
      if (name === chosenSlayer) {
        return (
          `${givenUsername}'s ${chosenSlayer} slayer: ` +
          `Level ${slayerData.level.level} (${slayerData.level.xp.toLocaleString()}) ` +
          `Highest tier kills: ${this.getHighestTierKills(slayerData, name).toLocaleString()}`
        )
      }
    }

    const output: string[] = []
    for (const [name, slayer] of Object.entries({
      zombie: slayerBosses.zombie,

      spider: slayerBosses.spider,

      wolf: slayerBosses.wolf,

      enderman: slayerBosses.enderman,

      blaze: slayerBosses.blaze,

      vampire: slayerBosses.vampire
    })) {
      output.push(`${name} ${slayer.level.level}`)
    }
    return `${givenUsername}'s slayers: ${output.join(' - ')}`
  }

  private getHighestTierKills(slayerData: SkyBlockMemberSlayer, slayerName: string): number {
    if (['zombie', 'spider', 'vampire'].includes(slayerName)) return slayerData.tier5Kills
    return slayerData.tier4Kills
  }
}
