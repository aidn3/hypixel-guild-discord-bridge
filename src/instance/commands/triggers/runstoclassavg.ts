/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { SkyblockMember } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getSelectedSkyblockProfile, getUuidIfExists } from '../common/util.js'

const FloorsBaseEXP = {
  m6: 105_000,
  m7: 315_000
}

type ClassName = keyof SkyblockMember['dungeons']['classes']

export default class RunsToClassAvg extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Runs to class average',
      triggers: ['rtca'],
      description: 'Returns the number of runs needed to reach the average class level specified',
      example: `rtca %i %s`
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

  private getLevelWithOverflow(totalExperience: number, level: number, progress: number): number {
    const PER_LEVEL = 200_000_000
    const MAX_50_XP = 569_809_640

    if (totalExperience > MAX_50_XP) {
      // account for overflow
      const remainingExperience = totalExperience - MAX_50_XP
      const extraLevels = Math.floor(remainingExperience / PER_LEVEL)
      const fractionLevel = (remainingExperience % PER_LEVEL) / PER_LEVEL

      return 50 + extraLevels + fractionLevel
    } else {
      return Number(level) + progress / 100
    }
  }
}