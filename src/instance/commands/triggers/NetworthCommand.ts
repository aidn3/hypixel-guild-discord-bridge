/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import * as assert from 'node:assert'
import { HypixelSkyblockMuseumRaw } from 'hypixel-api-reborn'
import axios from 'axios'
import { getNetworth, localizedNetworth } from '../../../util/SkyblockApi'
import { ChatCommandContext, ChatCommandHandler } from '../Common'

export default class NetworthCommand extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Networth',
      triggers: ['networth', 'net', 'nw'],
      description: "Returns a calculation of a player's networth",
      example: `nw %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await context.app.mojangApi
      .profileByUsername(givenUsername)
      .then((mojangProfile) => mojangProfile.id)
      .catch(() => {
        /* return undefined */
      })

    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const selectedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles.find((p) => p.selected))
    assert(selectedProfile)

    const museumData = await axios
      .get(
        `https://api.hypixel.net/skyblock/museum?key=${context.app.hypixelApi.key}&profile=${selectedProfile.profile_id}`
      )
      .then((response) => response.data as HypixelSkyblockMuseumRaw)
      .then((museum) => museum.members[uuid] as object)

    const networthLocalized = await getNetworth(
      selectedProfile.members[uuid],
      selectedProfile.banking?.balance ?? 0,
      museumData
    ).then(localizedNetworth)

    return `${givenUsername}'s networth: ${networthLocalized}`
  }
}
