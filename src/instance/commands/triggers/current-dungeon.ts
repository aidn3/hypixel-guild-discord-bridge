import assert from 'node:assert'

import Moment from 'moment'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { MojangApi } from '../../../core/users/mojang'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
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

    if (selectedProfile.me.dungeons.treasures.length === 0)
      return `${givenUsername} hasn't done any dungeon runs lately.`

    let runs = selectedProfile.me.dungeons.treasures
    // runs aren't always chronologically ordered
    if (selectedProfile.me.dungeons.treasures.length > 1) {
      runs = runs.toSorted((a, b) => b.completionTimestamp - a.completionTimestamp)
    }

    const lastRun = runs[0]
    const floorDisplayName = `${lastRun.type === 'catacombs' ? 'F' : 'M'}${lastRun.dungeonTier}`

    let message = ''
    let foundPlayer = false
    for (const participant of lastRun.participants) {
      if (participant.playerUUID === uuid) {
        message += await this.parseDisplayMessage(
          context.app.mojangApi,
          participant.displayName,
          participant.playerUUID
        )
        foundPlayer = true
      }
    }
    assert.ok(foundPlayer)

    message +=
      lastRun.completionTimestamp + CurrentDungeon.ShowTimeAfter < Date.now()
        ? ` was last seen ${Moment(lastRun.completionTimestamp).fromNow()}`
        : ` is`

    message += ` playing ${floorDisplayName} `
    if (lastRun.participants.length <= 1) {
      message += `solo.`
    } else {
      message += `with `

      const participants = await Promise.all(
        lastRun.participants
          .filter((participant) => participant.playerUUID !== uuid)
          .map((participant) =>
            this.parseDisplayMessage(context.app.mojangApi, participant.displayName, participant.playerUUID)
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
