import assert from 'node:assert'

import DefaultAxios from 'axios'
import NodeCache from 'node-cache'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { formatTime } from '../../../utility/shared-utility'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Forge extends ChatCommandHandler {
  private static readonly Url =
    'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/refs/heads/master/items/%id%.json'

  private readonly cache = new NodeCache({ stdTTL: Duration.hours(6).toSeconds() })

  constructor() {
    super({
      triggers: ['forge', 'dwarven'],
      description: "Returns a player's Skyblock forge slots",
      example: `forge %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const forge = selectedProfile.forge?.forge_processes.forge_1
    if (forge === undefined || Object.values(forge).length === 0) {
      return context.app.i18n.t(($) => $['commands.forge.none'], { username: givenUsername })
    }

    const currentTime = Date.now()
    const parts: string[] = []
    for (const slot of Object.values(forge)) {
      let cached = this.cache.get<ForgeItem>(slot.id)
      if (cached === undefined) {
        cached = await DefaultAxios.get<ForgeItem>(Forge.Url.replace('%id%', slot.id)).then((response) => response.data)
        assert.ok(cached !== undefined)
        this.cache.set(slot.id, cached)
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const recipe = cached.recipes.find((entry) => entry.type === 'forge')
      if (recipe === undefined) {
        parts.push(`${slot.id} UNKNOWN`)
      } else {
        const name = cached.displayname.replaceAll(/§\w/g, '')
        const time = Duration.seconds(recipe.duration)
        const finishTime = slot.startTime + time.toMilliseconds()

        if (finishTime > currentTime) {
          parts.push(`${name} ${formatTime(finishTime)}`)
        } else {
          parts.push(`${name} completed`)
        }
      }
    }

    const compactMap = new Map<string, number>()
    for (const part of parts) {
      let time = compactMap.get(part) ?? 0
      time++
      compactMap.set(part, time)
    }
    const formatted = compactMap
      .entries()
      .toArray()
      .toSorted(([, count1], [, count2]) => count2 - count1)
      .map(([key, count]) => (count === 1 ? key : `${count}x${key}`))

    return `${givenUsername} forge: ${formatted.join(' - ')}`
  }
}

interface ForgeItem {
  displayname: string
  recipes: { type: 'forge'; duration: number }[]
}
