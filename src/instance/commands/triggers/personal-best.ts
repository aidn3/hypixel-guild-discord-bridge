import type { SkyBlockMemberDungeonsFloor } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatTime } from '../../../utility/shared-utility'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export interface FloorData {
  id: string
  timesPlayed: number
  fastestTimeS: number
  fastestTimeSPlus: number
}

export default class PersonalBest extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['pb', 'pbr', 'personalbest', 'floor'],
      description: 'Returns a players best dungeon run time',
      example: `pb %s m7`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const givenFloor = context.args[1]

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const latestProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!latestProfile) return playerNeverPlayedSkyblock(givenUsername)

    const floors: FloorData[] = []

    const catacombs = latestProfile.me.dungeons.catacombs
    for (const key of Object.keys(catacombs)) {
      if (!key.startsWith('floor')) continue
      if (key.endsWith('0')) continue

      const floorData = catacombs[key as keyof typeof masterCatacombs] as SkyBlockMemberDungeonsFloor | null
      if (floorData == undefined) continue

      floors.push({
        id: key.replaceAll('floor', 'f'),
        timesPlayed: floorData.timesPlayed,
        fastestTimeS: floorData.fastestTimeS,
        fastestTimeSPlus: floorData.fastestTimeSPlus
      })
    }

    const masterCatacombs = latestProfile.me.dungeons.masterCatacombs
    for (const key of Object.keys(masterCatacombs)) {
      if (!key.startsWith('floor')) continue
      if (key.endsWith('0')) continue

      const floorData = masterCatacombs[key as keyof typeof masterCatacombs] as SkyBlockMemberDungeonsFloor | null
      if (floorData == undefined) continue

      floors.push({
        id: key.replaceAll('floor', 'm'),
        timesPlayed: floorData.timesPlayed,
        fastestTimeS: floorData.fastestTimeS,
        fastestTimeSPlus: floorData.fastestTimeSPlus
      })
    }

    const floorData = floors.find((floor) => floor.id === givenFloor)
    if (floorData === undefined || floorData.timesPlayed === 0) {
      return `${givenUsername} has never done ${givenFloor} before.`
    }

    return `${givenUsername}'s ${givenFloor} completions ${floorData.timesPlayed} | S+: ${formatTime(floorData.fastestTimeSPlus)} | S: ${formatTime(floorData.fastestTimeS)}`
  }
}
