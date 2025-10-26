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

const FloorsBaseExp = {
  m6: 120_000,
  m7: 360_000
}

type ClassName = 'healer' | 'berserk' | 'mage' | 'archer' | 'tank'

export default class RunsToClassAverage extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['rtca'],
      description: 'Returns the number of runs needed to reach the average class level specified',
      example: `rtca Steve 50 m7`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const targetAverage = context.args[1] ? Number.parseInt(context.args[1], 10) : 50
    const selectedFloor = context.args[2]?.toLowerCase() ?? 'm7'

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    if (!(selectedFloor in FloorsBaseExp)) return `Invalid floor selected: ${selectedFloor}`
    const xpPerRun = FloorsBaseExp[selectedFloor as keyof typeof FloorsBaseExp]

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    if (selectedProfile.dungeons?.player_classes === undefined) {
      return playerNeverPlayedDungeons(givenUsername)
    }

    const heartOfGold = selectedProfile.essence?.perks?.heart_of_gold ?? 0
    const unbridledRage = selectedProfile.essence?.perks?.unbridled_rage ?? 0
    const coldEfficiency = selectedProfile.essence?.perks?.cold_efficiency ?? 0
    const toxophilite = selectedProfile.essence?.perks?.toxophilite ?? 0
    const diamondInTheRough = selectedProfile.essence?.perks?.diamond_in_the_rough ?? 0

    // 20% added for scarf shards
    // It is set to max value till Hypixel updates their API to include the actual values
    const classExpBoosts = {
      healer: (heartOfGold * 2) / 100 + 1 + 0.2,
      berserk: (unbridledRage * 2) / 100 + 1 + 0.2,
      mage: (coldEfficiency * 2) / 100 + 1 + 0.2,
      archer: (toxophilite * 2) / 100 + 1 + 0.2,
      tank: (diamondInTheRough * 2) / 100 + 1 + 0.2
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
}
