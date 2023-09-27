/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { HypixelSkyblockMuseumRaw } from 'hypixel-api-reborn'
import Axios from 'axios'
import { ChatCommandContext, ChatCommandHandler } from '../common/ChatInterface'
import { getNetworth, localizedNetworth } from '../../../util/SkyblockApi'

export default {
  triggers: ['networth', 'net', 'nw'],
  enabled: true,
  handler: async function (context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.clientInstance.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => null)

    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const selectedProfile = await context.clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((res) => res.profiles.find((p) => p.selected))

    const museumData = await Axios.get(
      `https://api.hypixel.net/skyblock/museum?key=${context.clientInstance.app.hypixelApi.key}&profile=${selectedProfile.profile_id}`
    )
      .then((res) => res.data as unknown as HypixelSkyblockMuseumRaw)
      .then((museum) => museum.members[uuid])

    const networthLocalized = await getNetworth(
      selectedProfile.members[uuid],
      selectedProfile.banking?.balance ?? 0,
      museumData
    ).then(localizedNetworth)

    return `${givenUsername}'s networth: ${networthLocalized}`
  }
} satisfies ChatCommandHandler
