import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  capitalize,
  getSelectedSkyblockProfileRaw,
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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(context, givenUsername)
    const bestiary = selectedProfile.bestiary
    if (bestiary === undefined) return `${givenUsername} has never killed on this profile.`

    let response = `${givenUsername} has `
    response +=
      bestiary.milestone?.last_claimed_milestone === undefined || bestiary.milestone.last_claimed_milestone === 0
        ? 'never claimed bestiary milestones on this profile.'
        : `claimed ${bestiary.milestone.last_claimed_milestone} bestiary milestones.`

    if (bestiaryName !== undefined) {
      const acceptedNames = new Map<string, number>()
      for (const [name, count] of Object.entries(bestiary.kills)) {
        if (name === 'last_killed_mob' || typeof count !== 'number') continue

        const nameNormalized = name
          .replaceAll(/_\d+$/g, '')
          .split('_')
          .map((part) => capitalize(part))
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
          .join(' ')

        if (!nameNormalized.toLowerCase().includes(bestiaryName.toLowerCase())) continue
        const acceptedValue = acceptedNames.get(nameNormalized) ?? 0
        acceptedNames.set(nameNormalized, acceptedValue + count)
      }

      if (acceptedNames.size === 0) {
        return `${givenUsername} has never killed anything like that on this profile.`
      } else {
        const entries = acceptedNames
          .entries()
          .toArray()
          .toSorted(([, a], [, b]) => b - a)
          .slice(0, 3)

        response += ` ${entries.map(([name, count]) => `${name} ${count.toLocaleString('en-US')}`).join(' - ')}`
      }
    }

    return response
  }
}
