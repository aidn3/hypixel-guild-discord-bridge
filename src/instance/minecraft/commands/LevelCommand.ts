import MinecraftInstance from '../MinecraftInstance'
import { MinecraftCommandMessage } from '../common/ChatInterface'

export default {
  triggers: ['level', 'lvl', 'l'],
  enabled: true,
  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const givenUsername = args[0] ?? username

    const uuid = await clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((p) => p.id)
      .catch(() => null)

    if (uuid == null) {
      return `No such username! (given: ${givenUsername})`
    }

    const networthLocalized = await clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response: any) => response.profiles)
      .then((profiles: any[]) => profiles.filter((p) => p.selected)[0])
      .then((res: any) => res.members[uuid]?.leveling?.experience ?? 0)
      .then((exp) => (exp / 100).toFixed(2))

    return `${givenUsername}'s level: ${networthLocalized}`
  }
} satisfies MinecraftCommandMessage
