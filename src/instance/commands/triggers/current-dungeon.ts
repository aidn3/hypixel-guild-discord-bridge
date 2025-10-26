import assert from 'node:assert'

import Moment from 'moment'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { MojangApi } from '../../../core/users/mojang'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class CurrentDungeon extends ChatCommandHandler {
  private static readonly ShowTimeAfter = 30 * 60 * 1000

  constructor() {
    super({
      triggers: ['currentdungeon', 'currdungeon', 'cd'],
      description: "Returns a player's last dungeon run",
      example: `cd %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const dungeons = selectedProfile.dungeons
    if (dungeons === undefined) return playerNeverPlayedDungeons(givenUsername)

    let runs = dungeons.treasures?.runs
    if (runs === undefined || runs.length === 0) return `${givenUsername} hasn't done any dungeon runs lately.`

    if (runs.length > 1) {
      // runs aren't always chronologically ordered
      runs = runs.toSorted((a, b) => b.completion_ts - a.completion_ts)
    }

    const lastRun = runs[0]
    const floorDisplayName = `${lastRun.dungeon_type === 'catacombs' ? 'F' : 'M'}${lastRun.dungeon_tier}`

    let message = ''
    let foundPlayer = false
    for (const participant of lastRun.participants) {
      if (participant.player_uuid === uuid) {
        message += await this.parseDisplayMessage(
          context.app.mojangApi,
          participant.display_name,
          participant.player_uuid
        )
        foundPlayer = true
      }
    }
    assert.ok(foundPlayer)

    message +=
      lastRun.completion_ts + CurrentDungeon.ShowTimeAfter < Date.now()
        ? ` was last seen ${Moment(lastRun.completion_ts).fromNow()}`
        : ` is`

    message += ` playing ${floorDisplayName} `
    if (lastRun.participants.length <= 1) {
      message += `solo.`
    } else {
      message += `with `

      const participants = await Promise.all(
        lastRun.participants
          .filter((participant) => participant.player_uuid !== uuid)
          .map((participant) =>
            this.parseDisplayMessage(context.app.mojangApi, participant.display_name, participant.player_uuid)
          )
      )
      message += participants.join(', ')

      message += '.'
    }

    return message
  }

  private async parseDisplayMessage(mojangApi: MojangApi, message: string, uuid: string): Promise<string> {
    const cleanMessage = message.trim().replaceAll(/§./g, '')
    const regex = /^(\w{2,16}): (\w+) \((\d+)\)$/g
    const match = regex.exec(cleanMessage)

    if (!match) return message
    const oldUsername = match[1]
    const className = match[2]
    const classLevel = match[3]

    const updatedUsername = await mojangApi
      .profileByUuid(uuid)
      .then((profile) => profile.name)
      .catch(() => oldUsername)
    return `${updatedUsername} (${className} ${classLevel})`
  }
}
