import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Bestiary extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['be', 'bestiary'],
      description: "Returns a player's Bestiary stats",
      example: `be %s dreadlord`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const bestiaryName = context.args.at(1)

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(givenUsername)

    let response = `${givenUsername} has `
    response +=
      selectedProfile.me.bestiary.lastClaimedMilestone === 0
        ? 'never claimed bestiary milestones on this profile.'
        : `claimed ${selectedProfile.me.bestiary.lastClaimedMilestone} bestiary milestones.`

    if (bestiaryName !== undefined) {
      const bestiaryStats = Object.keys(selectedProfile.me.bestiary.kills)
        .filter((key) => key !== 'last_killed_mob')
        .filter((key) => key.replaceAll('_', ' ').toLowerCase().includes(bestiaryName.toLowerCase()))
        .map((key) => selectedProfile.me.bestiary.kills[key])
        .reduce((a, b) => a + b, 0)

      if (bestiaryStats === 0) return `${givenUsername} has never killed anything like that on this profile.`
      response += ` ${bestiaryStats.toLocaleString('en-US')} total kill on ${bestiaryName}!`
    }

    return response
  }
}
