import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

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

    const networthLocalized = await context.clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response: any) => response.profiles)
      .then((profiles: any[]) => profiles.filter((p) => p.selected)[0])
      .then((res: any) => res.members[uuid]?.leveling?.experience ?? 0)
      .then((exp) => (exp / 100).toFixed(2))

    return `${givenUsername}'s level: ${networthLocalized}`
  }
} satisfies MinecraftCommandMessage
