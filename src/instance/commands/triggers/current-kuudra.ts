import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { capitalize, formatTime } from '../../../utility/shared-utility'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class CurrentKuudra extends ChatCommandHandler {
  private static readonly ShowTimeAfter = 30 * 60 * 1000

  constructor() {
    super({
      triggers: ['currentkuudra', 'currkuudra', 'ck'],
      description: "Returns a player's last kuudra run",
      example: `ck %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const dungeons = selectedProfile.dungeons
    if (dungeons === undefined) return playerNeverPlayedDungeons(givenUsername)

    let runs = dungeons.treasures?.runs?.filter((run) => run.type === 'KUUDRA')
    if (runs === undefined || runs.length === 0) return `${givenUsername} hasn't done any Kuudra runs lately.`

    if (runs.length > 1) {
      // runs aren't always chronologically ordered
      runs = runs.toSorted((a, b) => b.completion_ts - a.completion_ts)
    }

    const lastRun = runs[0]
    const floorDisplayName = capitalize(lastRun.tier_id)

    let message = ''
    let foundPlayer = false
    for (const participant of lastRun.participants) {
      if (participant.player_uuid === uuid) {
        message += givenUsername
        foundPlayer = true
        break
      }
    }
    assert.ok(foundPlayer)

    message +=
      lastRun.completion_ts + CurrentKuudra.ShowTimeAfter < Date.now()
        ? ` was last seen ${formatTime(Date.now() - lastRun.completion_ts)} ago`
        : ` is`

    message += ` playing ${floorDisplayName} `
    if (lastRun.participants.length <= 1) {
      message += `solo.`
    } else {
      message += `with `

      const participants = await Promise.all(
        lastRun.participants
          .filter((participant) => participant.player_uuid !== uuid)
          .map((participant) => context.app.mojangApi.profileByUuid(participant.player_uuid))
      )
      message += participants.map((profile) => profile.name).join(', ')

      message += '.'
    }

    return message
  }
}
