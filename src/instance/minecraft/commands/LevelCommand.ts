import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { HypixelSkyblock } from '../../../type/HypixelApiType'

export default {
  triggers: ['level', 'lvl', 'l'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((p) => p.id)
      .catch(() => null)

    if (uuid == null) {
      return `No such username! (given: ${givenUsername})`
    }

    const levelLocalized = await context.clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((res) => res as unknown as HypixelSkyblock)
      .then((response) => response.profiles)
      .then((profiles) => profiles.filter((p) => p.selected)[0])
      .then((res) => res.members[uuid].leveling?.experience ?? 0)
      .then((exp) => (exp / 100).toFixed(2))

    return `${givenUsername}'s level: ${levelLocalized}`
  }
} satisfies ChatCommandHandler
