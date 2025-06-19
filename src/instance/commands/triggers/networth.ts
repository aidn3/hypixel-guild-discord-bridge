/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import Axios, { type AxiosResponse } from 'axios'
import { ProfileNetworthCalculator } from 'skyhelper-networth'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, localizedNetworth, playerNeverPlayedSkyblock, usernameNotExists } from '../common/util.js'

export default class Networth extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['networth', 'net', 'nw'],
      description: "Returns a calculation of a player's networth",
      example: `nw %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles?.find((p) => p.selected))
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    let museumData: object | undefined
    try {
      museumData = await Axios.get(
        `https://api.hypixel.net/skyblock/museum?key=${context.app.hypixelApi.key}&profile=${selectedProfile.profile_id}`
      )
        .then((response: AxiosResponse<HypixelSkyblockMuseumRaw, unknown>) => response.data)
        .then((museum) => museum.members[uuid] as object)
    } catch {
      return `${context.username}, error fetching museum data?`
    }

    const calculator = new ProfileNetworthCalculator(
      selectedProfile.members[uuid],
      museumData,
      selectedProfile.banking?.balance ?? 0
    )
    const networth = await calculator
      .getNetworth({ onlyNetworth: true })
      .then((response) => response.networth)
      .catch(() => undefined)
    if (networth === undefined) return `${context.username}, cannot calculate the networth?`
    const nonCosmetic = await calculator
      .getNonCosmeticNetworth({ onlyNetworth: true })
      .then((response) => response.networth)
      .catch(() => undefined)
    if (nonCosmetic === undefined) return `${context.username}, cannot calculate the non-cosmetic networth?`

    return `${givenUsername}'s networth: ${localizedNetworth(networth)}, non-cosmetic: ${localizedNetworth(nonCosmetic)}`
  }
}

interface HypixelSkyblockMuseumRaw {
  members: Record<string, unknown>
}
