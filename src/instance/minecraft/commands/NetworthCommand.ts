/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import * as assert from 'node:assert'
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
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const selectedProfile = await context.clientInstance.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles.find((p) => p.selected))
    assert(selectedProfile)

    const museumData = await Axios.get(
      `https://api.hypixel.net/skyblock/museum?key=${context.clientInstance.app.hypixelApi.key}&profile=${selectedProfile.profile_id}`
    )
      .then((response) => response.data as HypixelSkyblockMuseumRaw)
      .then((museum) => museum.members[uuid])

    const networthLocalized = await getNetworth(
      selectedProfile.members[uuid],
      selectedProfile.banking?.balance ?? 0,
      museumData
    ).then(localizedNetworth)

    return `${givenUsername}'s networth: ${networthLocalized}`
  }
} satisfies ChatCommandHandler
