/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import MinecraftInstance from '../MinecraftInstance'
import { MinecraftCommandMessage } from '../common/ChatInterface'

import { getNetworth, localizedNetworth } from '../../../util/SkyblockApi'
import { HypixelSkyblock } from '../../../type/HypixelType'

export default {
  triggers: ['networth', 'net', 'nw'],
  enabled: true,
  handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {
    const givenUsername = args[0] ?? username

    const uuid = await clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => null)

    if (uuid == null) {
      return `No such username! (given: ${givenUsername})`
    }

    const networthLocalized = await clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response: any) => response.profiles)
      .then((profiles: any[]) => profiles.filter((p) => p.selected)[0])
      .then(async (res: any) => await getNetworth(res.members[uuid], res.banking?.balance ?? 0))
      .then(localizedNetworth)

    return `${givenUsername}'s networth: ${networthLocalized}`
  }
} satisfies MinecraftCommandMessage
