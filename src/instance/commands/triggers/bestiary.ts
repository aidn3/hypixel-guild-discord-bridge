import assert from 'node:assert'

import DefaultAxios from 'axios'
import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Bestiary extends ChatCommandHandler {
  private static readonly MaxLife = Duration.hours(6)
  private static readonly Url =
    'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/refs/heads/master/constants/bestiary.json'

  private readonly singletonPromise = new PromiseQueue(1)
  private fetchedAt = -1

  private result: Record<string, string[]> | undefined

  constructor() {
    super({
      triggers: ['be', 'bestiary'],
      description: "Returns a player's Bestiary stats",
      example: `be %s dreadlord`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const bestiaryName = context.args
      .slice(1)
      .filter((part) => part.trim())
      .join(' ')

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(context, givenUsername)
    const bestiary = selectedProfile.bestiary
    if (bestiary === undefined) return `${givenUsername} has never killed on this profile.`

    let response = `${givenUsername} has `
    response +=
      bestiary.milestone?.last_claimed_milestone === undefined || bestiary.milestone.last_claimed_milestone === 0
        ? 'never claimed bestiary milestones on this profile.'
        : `claimed ${bestiary.milestone.last_claimed_milestone} bestiary milestones.`

    if (bestiaryName.length > 0) {
      await this.singletonPromise.add(() => this.tryUpdate(context.logger))
      assert.ok(this.result !== undefined)

      const resultList = new Map<string, number>()
      for (const [name, idList] of Object.entries(this.result)) {
        if (!name.toLowerCase().includes(bestiaryName.toLowerCase())) continue

        const valueSoFar = resultList.get(name) ?? 0
        let additionalValue = 0
        for (const id of idList) {
          const subCount = bestiary.kills[id]
          if (typeof subCount === 'number') additionalValue += subCount
        }

        resultList.set(name, valueSoFar + additionalValue)
      }

      if (resultList.size === 0) {
        return `${givenUsername} has never killed anything like that on this profile.`
      } else {
        const entries = resultList
          .entries()
          .toArray()
          .toSorted(([, a], [, b]) => b - a)
          .slice(0, 3)

        response += ` ${entries.map(([name, count]) => `${name} ${count.toLocaleString('en-US')}`).join(' - ')}`
      }
    }

    return response
  }

  private async tryUpdate(logger: Logger): Promise<void> {
    if (this.fetchedAt + Bestiary.MaxLife.toMilliseconds() < Date.now()) {
      this.result = {}
      const response = await DefaultAxios.get<NeuBestiary>(Bestiary.Url).then((response) => response.data)

      const categoriesToCheck = Object.entries(response)
        .filter(([key]) => key !== 'brackets')
        .flatMap(([, category]) => Object.entries(category))

      // Although it should NEVER happen. It is still a good idea to assume a max allowed work when doing recursive operations.
      // Iterations required as of writing this: 78
      const MaxIterations = 10_000
      let currentIteration = 0

      while (categoriesToCheck.length > 0) {
        assert.ok(currentIteration++ < MaxIterations)

        const entry = categoriesToCheck.pop()
        assert.ok(entry !== undefined)

        const [key, category] = entry
        if (key === 'mobs') {
          for (const mob of category as MobCategory['mobs']) {
            const name = mob.name.replaceAll(/§\w/g, '')
            if (name in this.result) {
              logger.warn(`Already detected name "${name}" for bestiary command??. Continuing anyways.`)
            }

            this.result[name] = [...(this.result[name] ?? []), ...mob.mobs]
          }
        } else if (key !== 'icon' && key !== 'hasSubcategories' && key !== 'name') {
          categoriesToCheck.push(...Object.entries(category as Record<string, unknown>))
        } else {
          logger.warn(`Ignored key: ${key}`)
        }
      }

      this.fetchedAt = Date.now()
    }
  }
}

type NeuBestiary = Record<string, Record<string, unknown>>

interface MobCategory {
  mobs: { name: string; mobs: string[] }[]
}
