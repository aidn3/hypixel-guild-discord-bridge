import type { ChatCommandContext } from '../common/command-interface'
import { ChatCommandHandler } from '../common/command-interface'

export default class Level extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Level',
      triggers: ['level', 'lvl', 'l'],
      description: "Returns a player's skyblock level",
      example: `lvl %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.app.mojangApi
      .profileByUsername(givenUsername)
      .then((p) => p.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const levelLocalized = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles)
      .then((profiles) => profiles.find((p) => p.selected))
      .then((response) => response?.members[uuid].leveling?.experience ?? 0)
      .then((exp) => (exp / 100).toFixed(2))

    return `${givenUsername}'s level: ${levelLocalized}`
  }
}
