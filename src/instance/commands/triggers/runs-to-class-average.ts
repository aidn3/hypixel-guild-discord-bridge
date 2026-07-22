import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getDungeonLevelWithOverflow } from '../../../core/hypixel/hypixel-skyblock'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  parseEncodedNbt,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

// Credit: https://adjectils.com/dungeon.html
const FloorsBaseExp = {
  m7: 300_000,
  m6: 100_000,
  m5: 70_000,
  m4: 55_000,
  m3: 35_000,
  m2: 20_000,
  m1: 15_000
}

type ClassName = 'healer' | 'berserk' | 'mage' | 'archer' | 'tank'

/* eslint-disable @typescript-eslint/naming-convention */

type InventoryItem = { id?: number; Count?: number; tag?: ItemData } | object

/* eslint-disable @typescript-eslint/naming-convention */

interface ItemData {
  display?: { Name?: string; Lore?: string[] }
}

export default class RunsToClassAverage extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['rtca'],
      description: 'Returns the number of runs needed to reach the average class level specified',
      example: `rtca Steve m7 50`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const selectedFloor = context.args[1]?.toLowerCase() ?? 'm7'
    const targetAverage = Number.isFinite(+context.args[2]) ? +context.args[2] : 50

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    if (!(selectedFloor in FloorsBaseExp)) return `Invalid floor selected: ${selectedFloor}`
    const xpPerRun = FloorsBaseExp[selectedFloor as keyof typeof FloorsBaseExp]

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (selectedProfile.dungeons?.player_classes === undefined) {
      return playerNeverPlayedDungeons(givenUsername)
    }

    const heartOfGold = selectedProfile.player_data.perks?.heart_of_gold ?? 0
    const unbridledRage = selectedProfile.player_data.perks?.unbridled_rage ?? 0
    const coldEfficiency = selectedProfile.player_data.perks?.cold_efficiency ?? 0
    const toxophilite = selectedProfile.player_data.perks?.toxophilite ?? 0
    const diamondInTheRough = selectedProfile.player_data.perks?.diamond_in_the_rough ?? 0

    const scarfShards = selectedProfile.attributes?.stacks.catacombs_graduate ?? 0
    let scarfShardsBoost = 0

    switch (scarfShards) {
      case 1: {
        scarfShardsBoost = 0.02
        break
      }
      case 2: {
        scarfShardsBoost = 0.04
        break
      }
      case 3: {
        scarfShardsBoost = 0.06
        break
      }
      case 5: {
        scarfShardsBoost = 0.08
        break
      }
      case 7: {
        scarfShardsBoost = 0.1
        break
      }
      case 9: {
        scarfShardsBoost = 0.12
        break
      }
      case 12: {
        scarfShardsBoost = 0.14
        break
      }
      case 15: {
        scarfShardsBoost = 0.16
        break
      }
      case 19: {
        scarfShardsBoost = 0.18
        break
      }
      case 24: {
        {
          scarfShardsBoost = 0.2
          // No default
        }
        break
      }
    }

    let scarfAccessoryBoost = 0
    const accessoriesRaw = selectedProfile.inventory?.bag_contents?.talisman_bag?.data
    if (accessoriesRaw !== undefined) {
      const accessories = await parseEncodedNbt<{ i: InventoryItem[] }>(accessoriesRaw)

      for (const item of accessories.i) {
        if ('tag' in item && item.tag?.display?.Name) {
          let name = item.tag.display.Name
          name = name.replaceAll(/§./g, '')

          if (name.includes("Scarf's Grimoire") && 0.06 > scarfAccessoryBoost) scarfAccessoryBoost = 0.06
          else if (name.includes("Scarf's Thesis") && 0.04 > scarfAccessoryBoost) scarfAccessoryBoost = 0.04
          else if (name.includes("Scarf's Studies") && 0.02 > scarfAccessoryBoost) scarfAccessoryBoost = 0.02
        }
      }
    }

    let hecatombBoost = 0
    const armorRaw = selectedProfile.inventory?.inv_armor?.data
    if (armorRaw !== undefined) {
      const armor = await parseEncodedNbt<{ i: InventoryItem[] }>(armorRaw)

      for (const item of armor.i) {
        if ('tag' in item && item.tag?.display?.Lore) {
          const lore = item.tag.display.Lore

          for (const line of lore) {
            const cleanLine = line.replaceAll(/§./g, '')

            if (cleanLine.includes('Hecatomb X')) hecatombBoost = 0.02
            else if (cleanLine.includes('Hecatomb IX')) hecatombBoost = 0.0184
            else if (cleanLine.includes('Hecatomb VIII')) hecatombBoost = 0.0168
            else if (cleanLine.includes('Hecatomb VII')) hecatombBoost = 0.0152
            else if (cleanLine.includes('Hecatomb VI')) hecatombBoost = 0.0136
            else if (cleanLine.includes('Hecatomb V')) hecatombBoost = 0.012
            else if (cleanLine.includes('Hecatomb IV')) hecatombBoost = 0.0104
            else if (cleanLine.includes('Hecatomb III')) hecatombBoost = 0.0088
            else if (cleanLine.includes('Hecatomb II')) hecatombBoost = 0.0072
            else if (cleanLine.includes('Hecatomb I')) hecatombBoost = 0.0056

            if (0 < hecatombBoost) break
          }
          if (0 < hecatombBoost) break
        }
      }
    }

    let floorCompletionsBoost = 0
    if (selectedFloor.toLowerCase() === 'm7') {
      floorCompletionsBoost =
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        0.02 * (Math.min(selectedProfile.dungeons.dungeon_types.master_catacombs?.tier_completions?.[7] || 1, 26) - 1)
    }

    /*
     * Bonuses:
     * - Scarf Shards 20%
     * - Scarf accessory Grimoire 6%
     * - Completing the same floor multiple times (https://wiki.hypixel.net/Dungeoneering#Maximizing_XP_Gains (wiki.hypixel.net was discontinued))
     *   └ You gain bonus 2% * (total floor completions -1)
     *     └ F1-F5 | 150% max XP buff | 76 max run cap
     *     └ F6    | 100% max XP buff | 51 max run cap
     *     └ F7/M7 | 50% max XP buff  | 26 max run cap
     * - 2% Maxed Hecatomb Enchantment
     *
     *  All stats are set to max assuming that the player who is using the command is already prepared to do hundreds of runs
     */

    const GlobalBoost = scarfShardsBoost + scarfAccessoryBoost + floorCompletionsBoost + hecatombBoost
    const additionalBoost = await this.getAdditionalBoost(context)

    const classExpBoosts = {
      healer: (heartOfGold * 2) / 100 + 1 + GlobalBoost + additionalBoost,
      berserk: (unbridledRage * 2) / 100 + 1 + GlobalBoost + additionalBoost,
      mage: (coldEfficiency * 2) / 100 + 1 + GlobalBoost + additionalBoost,
      archer: (toxophilite * 2) / 100 + 1 + GlobalBoost + additionalBoost,
      tank: (diamondInTheRough * 2) / 100 + 1 + GlobalBoost + additionalBoost
    } satisfies Record<ClassName, number>

    let totalRuns = 0
    const runsDone = {
      healer: 0,
      berserk: 0,
      mage: 0,
      archer: 0,
      tank: 0
    } as Record<ClassName, number>
    const classesExperiences = {
      healer: 0,
      berserk: 0,
      mage: 0,
      archer: 0,
      tank: 0
    } as Record<ClassName, number>

    for (const [className, classObject] of Object.entries(selectedProfile.dungeons.player_classes)) {
      classesExperiences[className as ClassName] = classObject?.experience ?? 0
    }

    let currentClassAverage = this.getClassAverage(classesExperiences, targetAverage)
    const classes = Object.keys(runsDone) as ClassName[]

    while (currentClassAverage < targetAverage) {
      let currentClassPlaying: undefined | ClassName = undefined
      for (const key of classes) {
        classesExperiences[key] += xpPerRun * 0.25 * classExpBoosts[key]
        if (currentClassPlaying === undefined || classesExperiences[key] < classesExperiences[currentClassPlaying]) {
          currentClassPlaying = key
        }
      }

      assert.ok(currentClassPlaying)
      classesExperiences[currentClassPlaying] += xpPerRun * 0.75 * classExpBoosts[currentClassPlaying]
      runsDone[currentClassPlaying]++

      currentClassAverage = this.getClassAverage(classesExperiences, targetAverage)
      totalRuns++

      if (totalRuns > 15_000) {
        return `${givenUsername} needs more than 15,000 runs to reach the average class level of ${targetAverage}.`
      }
    }

    if (totalRuns === 0) {
      return `${givenUsername} has reached c.a. ${targetAverage} already!`
    }

    return `${givenUsername} is ${totalRuns} ${selectedFloor.toUpperCase()} away from c.a. ${targetAverage} (${classes
      .filter((c) => runsDone[c] > 0)
      .map((c) => `${c} ${runsDone[c]}`)
      .join(' | ')})`
  }

  private getClassAverage(classData: Record<string, number>, targetAverage: number): number {
    const classesXp = Object.values(classData)
    return (
      classesXp
        .map((xp) => getDungeonLevelWithOverflow(xp))
        .map((level) => Math.min(level, targetAverage))
        .reduce((a, b) => a + b, 0) / classesXp.length
    )
  }

  private async getAdditionalBoost(context: ChatCommandContext): Promise<number> {
    let totalBoost = 0

    const government = await context.app.hypixelApi.getSkyblockElection()
    if (government.mayor.key === 'aura') {
      totalBoost += 0.55 // It is 55% instead of 50%. Why? I don't know. Maybe bugged
    } else if (government.mayor.key === 'derpy') {
      totalBoost += 0.5
    }

    return totalBoost
  }
}
