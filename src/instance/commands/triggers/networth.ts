/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { ProfileNetworthCalculator } from 'skyhelper-networth'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedSkyblock, shortenNumber, usernameNotExists } from '../common/utility'

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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => response.profiles?.find((p) => p.selected))
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    let museumData: object | undefined
    try {
      museumData = await context.app.hypixelApi
        .getSkyblockMuseum(uuid, selectedProfile.profile_id, { raw: true })
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

    return `${givenUsername}'s networth: ${shortenNumber(networth)}, non-cosmetic: ${shortenNumber(nonCosmetic)}`
  }
}
