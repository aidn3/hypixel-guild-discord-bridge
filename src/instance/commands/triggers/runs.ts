import assert from 'node:assert'
import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'

enum Catacombs {
  'entrance' = '0',
  'f1' = '1',
  'f2' = '2',
  'f3' = '3',
  'f4' = '4',
  'f5' = '5',
  'f6' = '6',
  'f7' = '7'
}

enum MasterMode {
  'm1' = '1',
  'm2' = '2',
  'm3' = '3',
  'm4' = '4',
  'm5' = '5',
  'm6' = '6',
  'm7' = '7'
}

export default class Runs extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Runs',
      triggers: ['runs', 'r'],
      description: 'Returns how many dungeon runs a player has done',
      example: `runs m7 %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const floor = context.args[0]?.toLowerCase()
    const givenUsername = context.args[1] ?? context.username
    let dungeonType: string | undefined = undefined

    if (Object.keys(Catacombs).includes(floor)) {
      dungeonType = 'catacombs'
    }
    if (Object.keys(MasterMode).includes(floor)) {
      dungeonType = 'mastermode'
    }
    if (dungeonType === undefined) {
      return `${context.username}, Invalid floor! (given: ${floor})`
    }

    const uuid = await context.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `${context.username}, Invalid username! (given: ${givenUsername})`
    }

    const parsedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles.find((p) => p.selected)?.members[uuid])
    assert(parsedProfile)

    let amount = 0

    if (dungeonType == 'catacombs') {
      amount =
        parsedProfile.dungeons.dungeon_types.catacombs.tier_completions[Catacombs[floor as keyof typeof Catacombs]]
    }
    if (dungeonType == 'mastermode') {
      amount =
        parsedProfile.dungeons.dungeon_types.master_catacombs.tier_completions[
          MasterMode[floor as keyof typeof MasterMode]
        ]
    }

    return `${givenUsername}: ${floor} - ${amount || 0}`
  }
}
