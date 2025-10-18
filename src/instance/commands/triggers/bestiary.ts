import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Bestiary extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['be', 'bestiary'],
      description: 'Returns a player\'s Bestiary stats',
      example: `be %s dreadlord`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const bestiaryName = context.args.at(1)

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if(selectedProfile === undefined) return playerNeverPlayedSkyblock(givenUsername)
    const bestiary = selectedProfile.bestiary
    if (bestiary === undefined) return `${givenUsername} has never killed on this profile.`

    let response = `${givenUsername} has `
    if (bestiary.milestone?.last_claimed_milestone === undefined || bestiary.milestone.last_claimed_milestone === 0) {
      response += 'never claimed bestiary milestones on this profile.'
    } else {
      response += `claimed ${bestiary.milestone.last_claimed_milestone} bestiary milestones.`
    }

    if (bestiaryName !== undefined) {
      const bestiaryStats = Object.keys(bestiary.kills)
        .filter((key) => key !== 'last_killed_mob')
        .filter((key) => key.replaceAll('_', ' ').toLowerCase().includes(bestiaryName.toLowerCase()))
        .map((key) => bestiary.kills[key])
        .reduce((a, b) => a + b, 0)

      if (bestiaryStats === 0) return `${givenUsername} has never killed anything like that on this profile.`
      response += ` ${bestiaryStats.toLocaleString('en-US')} total kill on ${bestiaryName}!`
    }

    return response
  }
}
