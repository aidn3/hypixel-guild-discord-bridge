import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility'

export default class Level extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['level', 'lvl', 'l'],
      description: "Returns a player's skyblock level",
      example: `lvl %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const response = await context.app.hypixelApi.getSkyblockProfiles(uuid, { raw: true })

    if (!response.profiles) return playerNeverPlayedSkyblock(context, givenUsername)
    const profile = response.profiles.find((p) => p.selected)
    assert.ok(profile)

    const selected = profile.members[uuid]
    assert.ok(selected)

    const exp = selected.leveling?.experience ?? 0
    const level = (exp / 100).toFixed(2)
    let result = `${givenUsername}'s `
    switch (profile.game_mode) {
      case 'ironman': {
        result += 'ironman profile is level '
        break
      }
      case 'bingo': {
        result += 'bingo profile is level '
        break
      }
      case 'island': {
        result += 'stranded profile is level '
        break
      }
      default: {
        result += 'skyblock profile is level '
      }
    }
    result += level

    return result
  }
}
