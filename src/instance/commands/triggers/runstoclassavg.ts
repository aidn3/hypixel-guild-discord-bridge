/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { SkyblockMember } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getSelectedSkyblockProfile, getUuidIfExists } from '../common/util.js'

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

type ClassName = keyof SkyblockV2Dungeons['player_classes']

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
    const targetAvg = context.args[0] ? Number.parseInt(context.args[0], 10) : 50
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
    const parsedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)

    const temporaryClassData = parsedProfile.dungeons.classes
    let temporaryClassAvg = this.getClassAverage(temporaryClassData)

    let runs = 0
    const runsDone = {
      berserk: 0,
      mage: 0,
      tank: 0,
      healer: 0,
      archer: 0
    } satisfies Record<ClassName, number>
    const classes = Object.keys(runsDone) as ClassName[]

    while (temporaryClassAvg < targetAvg) {
      runs++

      let temporaryClassPlaying: undefined | ClassName
      for (const c of classes) {
        temporaryClassData[c].xp += xpPerRun * 0.25 // add the "passive" exp
        if (!temporaryClassPlaying || temporaryClassData[c].xp < temporaryClassData[temporaryClassPlaying].xp) {
          temporaryClassPlaying = c
        }
      }

      temporaryClassData[temporaryClassPlaying!].xp += xpPerRun * 0.75 // add the "active" exp

      runsDone[temporaryClassPlaying!]++

      temporaryClassAvg = this.getClassAverage(temporaryClassData) // update the current temp class avg

      if (runs > 15_000) {
        return `${givenUsername} needs more than 15,000 runs to reach the average class level of ${targetAvg}.`
      }
    }

    return `${givenUsername} is ${runs} ${selectedFloor.toUpperCase()} away from c.a. ${targetAvg}: ${classes.map((c) => `${c}: ${runsDone[c]}`).join(', ')}`
  }

  private getClassAverage(classData: SkyblockMember['dungeons']['classes']): number {
    return (
      Object.values(classData)
        .map((c) => this.getLevelWithOverflow(c.xp, c.level, c.progress))
        .reduce((a, b) => a + b, 0) / Object.keys(classData).length
    )
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
