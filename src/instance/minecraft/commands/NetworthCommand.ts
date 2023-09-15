/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'

import { getNetworth, localizedNetworth } from '../../../util/SkyblockApi'
import { HypixelSkyblock } from '../../../type/HypixelApiType'

export default {
  triggers: ['networth', 'net', 'nw'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => null)

    if (uuid == null) {
      return `No such username! (given: ${givenUsername})`
    }

    const networthLocalized = await context.clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response: unknown) => response as HypixelSkyblock)
      .then((res) => res.profiles.filter((p) => p.selected)[0])
      .then(async (profile) => await getNetworth(profile.members[uuid], profile.banking?.balance ?? 0))
      .then(localizedNetworth)

    return `${givenUsername}'s networth: ${networthLocalized}`
  }
} satisfies ChatCommandHandler
