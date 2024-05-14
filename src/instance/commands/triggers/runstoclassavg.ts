import assert from 'node:assert'

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getUuidIfExists } from '../common/util.js'

const FloorsBaseEXP = {
  m6: 105_000,
  m7: 340_000
}

const DUNGEON_XP = [
  50, 75, 110, 160, 230, 330, 470, 670, 950, 1340, 1890, 2665, 3760, 5260, 7380, 10_300, 14_400, 20_000, 27_600, 38_000,
  52_500, 71_500, 97_000, 132_000, 180_000, 243_000, 328_000, 445_000, 600_000, 800_000, 1_065_000, 1_410_000,
  1_900_000, 2_500_000, 3_300_000, 4_300_000, 5_600_000, 7_200_000, 9_200_000, 1.2e7, 1.5e7, 1.9e7, 2.4e7, 3e7, 3.8e7,
  4.8e7, 6e7, 7.5e7, 9.3e7, 1.1625e8
]

type ClassName = 'healer' | 'berserk' | 'mage' | 'archer' | 'tank'

export default class RunsToClassAvg extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Runs to class average',
      triggers: ['rtca'],
      description: 'Returns the number of runs needed to reach the average class level specified',
      example: `rtca 50 Steve`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const targetAverage = context.args[0] ? Number.parseInt(context.args[0], 10) : 50
    const givenUsername = context.args[1] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const selectedFloor = 'm7'.toLowerCase()
    if (!(selectedFloor in FloorsBaseEXP)) {
      return `Invalid floor selected: ${selectedFloor}`
    }
    const xpPerRun = FloorsBaseEXP[selectedFloor as keyof typeof FloorsBaseEXP]

    const parsedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles.find((p) => p.selected)?.members[uuid])
    assert(parsedProfile)

    if (parsedProfile.dungeons.player_classes === undefined) {
      return `${givenUsername} never played dungeons before?`
    }

    const heartOfGold = parsedProfile.essence?.perks?.heart_of_gold ?? 0
    const unbridledRage = parsedProfile.essence?.perks?.unbridled_rage ?? 0
    const coldEfficiency = parsedProfile.essence?.perks?.cold_efficiency ?? 0
    const toxophilite = parsedProfile.essence?.perks?.toxophilite ?? 0
    const diamondInTheRough = parsedProfile.essence?.perks?.diamond_in_the_rough ?? 0

    const classExpBoosts = {
      healer: (heartOfGold * 2) / 100 + 1,
      berserk: (unbridledRage * 2) / 100 + 1,
      mage: (coldEfficiency * 2) / 100 + 1,
      archer: (toxophilite * 2) / 100 + 1,
      tank: (diamondInTheRough * 2) / 100 + 1
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

    for (const [className, classObject] of Object.entries(parsedProfile.dungeons.player_classes)) {
      classesExperiences[className as ClassName] = classObject?.experience ?? 0
    }

    let currentClassAverage = this.getClassAverage(classesExperiences)
    const classes = Object.keys(runsDone) as ClassName[]

    while (currentClassAverage < targetAverage) {
      let currentClassPlaying: undefined | ClassName = undefined
      for (const key of classes) {
        classesExperiences[key] += xpPerRun * 0.25 * classExpBoosts[key]
        if (currentClassPlaying === undefined || classesExperiences[key] < classesExperiences[currentClassPlaying]) {
          currentClassPlaying = key
        }
      }

      assert(currentClassPlaying)
      classesExperiences[currentClassPlaying] += xpPerRun * 0.75 * classExpBoosts[currentClassPlaying]
      runsDone[currentClassPlaying]++

      currentClassAverage = this.getClassAverage(classesExperiences)
      totalRuns++

      if (totalRuns > 15_000) {
        return `${givenUsername} needs more than 15,000 runs to reach the average class level of ${targetAverage}.`
      }
    }

    return `${givenUsername} is ${totalRuns} ${selectedFloor.toUpperCase()} away from c.a. ${targetAverage}: ${classes.map((c) => `${c}: ${runsDone[c]}`).join(', ')}`
  }

  private getClassAverage(classData: Record<string, number>): number {
    const classesXp = Object.values(classData)
    return classesXp.map((xp) => this.getLevelWithOverflow(xp)).reduce((a, b) => a + b, 0) / classesXp.length
  }

  private getLevelWithOverflow(experience: number): number {
    const PER_LEVEL = 200_000_000
    const MAX_50_XP = 569_809_640

    if (experience > MAX_50_XP) {
      // account for overflow
      const remainingExperience = experience - MAX_50_XP
      const extraLevels = Math.floor(remainingExperience / PER_LEVEL)
      const fractionLevel = (remainingExperience % PER_LEVEL) / PER_LEVEL

      return 50 + extraLevels + fractionLevel
    }

    let totalLevel = 0
    let remainingXP = experience

    for (const [index, levelXp] of DUNGEON_XP.entries()) {
      if (remainingXP > levelXp) {
        totalLevel = index + 1
        remainingXP -= levelXp
      } else {
        break
      }
    }

    const fractionLevel = remainingXP / DUNGEON_XP[totalLevel]
    return totalLevel + fractionLevel
  }
}
