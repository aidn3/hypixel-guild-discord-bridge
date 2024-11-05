import type { DungeonFloors, DungeonFloorsWithEntrance, SkyblockV2DungeonsTypes } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/util.js'

export default class PersonalBest extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Personalbest',
      triggers: ['pb', 'pbr', 'personalbest'],
      description: 'Returns a players best dungeon run time',
      example: `pb %s m7`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const givenFloor = context.args[1]

    const resolvedFloor = this.getDungeonFloor(givenFloor)
    if (resolvedFloor.error) return resolvedFloor.error

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const skyblockProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!skyblockProfile) return playerNeverPlayedSkyblock(givenUsername)

    const dungeon = skyblockProfile.dungeons?.dungeon_types
    if (!dungeon) return playerNeverPlayedDungeons(givenUsername)

    return PersonalBest.formatMessage(givenUsername, resolvedFloor, dungeon)
  }

  private static formatMessage(username: string, floor: DungeonFloorResolve, dungeon: SkyblockV2DungeonsTypes): string {
    if (!floor.highestFloor) {
      const selectedFloorWithEntrance = floor.floor
      const selectedFloorWithoutEntrance = floor.floor as DungeonFloors

      if (floor.masterMode) {
        return this.formatFloor(
          username,
          `master mode ${selectedFloorWithoutEntrance}`,
          dungeon.master_catacombs.fastest_time_s?.[selectedFloorWithoutEntrance],
          dungeon.master_catacombs.fastest_time_s_plus?.[selectedFloorWithoutEntrance]
        )
      } else if (selectedFloorWithEntrance === '0') {
        return this.formatFloor(
          username,
          `entrance floor`,
          dungeon.catacombs.fastest_time?.[selectedFloorWithEntrance],
          undefined
        )
      } else {
        return this.formatFloor(
          username,
          `floor ${selectedFloorWithEntrance}`,
          dungeon.catacombs.fastest_time_s?.[selectedFloorWithEntrance],
          dungeon.catacombs.fastest_time_s_plus?.[selectedFloorWithoutEntrance]
        )
      }
    }

    // check for highest S+ master mode
    if (dungeon.master_catacombs.fastest_time_s_plus) {
      let selectedFloor: DungeonFloors | undefined = undefined
      for (const floorName of Object.keys(dungeon.master_catacombs.fastest_time_s_plus).reverse()) {
        if (floorName === 'best') continue
        selectedFloor = floorName as DungeonFloors
        break
      }
      if (selectedFloor !== undefined) {
        return this.formatFloor(
          username,
          `master mode ${selectedFloor}`,
          dungeon.master_catacombs.fastest_time_s?.[selectedFloor],
          dungeon.master_catacombs.fastest_time_s?.[selectedFloor]
        )
      }
    }

    // check for highest S+ normal mode
    if (dungeon.catacombs.fastest_time_s_plus) {
      let selectedFloor: DungeonFloors | undefined = undefined
      for (const floorName of Object.keys(dungeon.catacombs.fastest_time_s_plus).reverse()) {
        if (floorName === 'best') continue
        selectedFloor = floorName as DungeonFloors
        break
      }
      if (selectedFloor !== undefined) {
        return this.formatFloor(
          username,
          `floor ${selectedFloor}`,
          dungeon.catacombs.fastest_time_s?.[selectedFloor],
          dungeon.catacombs.fastest_time_s?.[selectedFloor]
        )
      }
    }

    if (dungeon.catacombs.fastest_time?.['0']) {
      return this.formatFloor(username, 'Entrance floor', dungeon.catacombs.fastest_time['0'], undefined)
    }

    return 'Player never played dungeons before?'
  }

  private static formatFloor(
    username: string,
    floorName: string,
    s: number | undefined,
    sPlus: number | undefined
  ): string {
    if (s === undefined && sPlus === undefined) return `${username} never finished ${floorName}`

    let result = `${username} finished ${floorName} with `

    if (s !== undefined && sPlus !== undefined && s === sPlus) {
      result += `an S/+ ${this.formatTime(sPlus)}`
      return result
    }

    if (s !== undefined) result += `an S ${this.formatTime(s)}`
    if (sPlus !== undefined) result += ` and an S+ ${this.formatTime(sPlus)}`

    return result
  }

  private static formatTime(time: number): string {
    let result = ''
    let remaining = Math.floor(time / 1000) // milli to seconds

    const minutes = Math.floor(remaining / 60)
    if (minutes > 0) result += `${minutes}m`
    remaining = remaining % 60

    result += `${remaining}s`

    return result
  }

  private getDungeonFloor(query: string | undefined): DungeonFloorResolve {
    const result: DungeonFloorResolve = { masterMode: false, floor: '0', highestFloor: false, error: undefined }
    if (query === undefined) {
      result.highestFloor = true
      return result
    }

    query = query.toLowerCase()
    if (query.includes('entrance')) {
      result.floor = '0'
      return result
    }
    const floor = Number.parseInt(query.replaceAll(/\D+/g, ''), 10)

    if (Number.isNaN(floor)) {
      result.highestFloor = true
      return result
    }

    if (query.startsWith('m')) {
      result.masterMode = true

      if (floor >= 1 && floor <= 7) {
        result.floor = floor.toString(10) as DungeonFloorsWithEntrance
        return result
      }

      result.error = 'Mastermode floor can only be between 1 and 7'
      return result
    }

    if (floor >= 0 && floor <= 7) {
      result.floor = floor.toString(10) as DungeonFloorsWithEntrance
      return result
    }
    result.error = 'Dungeon floor must be between 0 (entrance) and 7'
    return result
  }
}

interface DungeonFloorResolve {
  masterMode: boolean
  floor: DungeonFloorsWithEntrance
  highestFloor: boolean
  error: string | undefined
}
