import assert from 'node:assert'

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getDungeonLevelWithOverflow, getUuidIfExists } from '../common/util.js'

const FloorsBaseEXP = {
  m6: 105_000,
  m7: 340_000
}

type ClassName = 'healer' | 'berserk' | 'mage' | 'archer' | 'tank'

export default class RunsToClassAverage extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Runs to class average',
      triggers: ['rtca'],
      description: 'Returns the number of runs needed to reach the average class level specified',
      example: `rtca 50 Steve`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const targetAverage = context.args[1] ? Number.parseInt(context.args[1], 10) : 50

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
    return classesXp.map((xp) => getDungeonLevelWithOverflow(xp)).reduce((a, b) => a + b, 0) / classesXp.length
  }
}
