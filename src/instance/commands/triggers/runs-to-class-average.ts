import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getDungeonLevelWithOverflow,
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

// Credit: https://adjectils.com/dungeon.html
const FloorsBaseExp = {
  m7: 300_000,
  m6: 110_000,
  m5: 70_000,
  m4: 55_000,
  m3: 35_000,
  m2: 20_000,
  m1: 15_000
}

type ClassName = 'healer' | 'berserk' | 'mage' | 'archer' | 'tank'

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
    const targetAverage = context.args[2] ? Number.parseInt(context.args[2], 10) : 50

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    if (!(selectedFloor in FloorsBaseExp)) return `Invalid floor selected: ${selectedFloor}`
    const xpPerRun = FloorsBaseExp[selectedFloor as keyof typeof FloorsBaseExp]

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (selectedProfile.dungeons?.player_classes === undefined) {
      return playerNeverPlayedDungeons(givenUsername)
    }

    // TODO: fix perks changed location into "leveling" section.
    //  As it is right now, all the values here are 0.
    //  however, the rtca is accurate as it is right now.
    //  Further testing should be done later when volatile perks like Aura mayor are gone.
    const heartOfGold = selectedProfile.essence?.perks?.heart_of_gold ?? 0
    const unbridledRage = selectedProfile.essence?.perks?.unbridled_rage ?? 0
    const coldEfficiency = selectedProfile.essence?.perks?.cold_efficiency ?? 0
    const toxophilite = selectedProfile.essence?.perks?.toxophilite ?? 0
    const diamondInTheRough = selectedProfile.essence?.perks?.diamond_in_the_rough ?? 0

    /*
     * Bonuses:
     * - Scarf Shards 20%
     * - Scarf accessory Grimoire 6%
     * - 50% XP boost when did runs on selected floor maxed at 26 runs (50% on MM) (https://wiki.hypixel.net/Dungeoneering#Dungeoneering_XP_Gain)
     * - 10% Expert Ring
     * - 2% Maxed Hecatomb Enchantment
     *
     *  All stats are set to max assuming that the player who is using the command is already prepared to do hundreds of runs
     */
    const GlobalBoost = 0.2 + 0.06 + 0.5 + 0.1 + 0.02
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
