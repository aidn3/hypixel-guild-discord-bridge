/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/
import { PrepareSkyBlockProfileForSkyHelperNetworth } from 'hypixel-api-reborn'
import { ProfileNetworthCalculator } from 'skyhelper-networth'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

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

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const museum = await context.app.hypixelApi.getSkyBlockMuseum(selectedProfile.profileId, { raw: true })
    if (!museum.isRaw()) throw new Error('Museum data is not Raw Data.')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const museumProfile: Record<string, any> | undefined = museum.data.members[selectedProfile.me.uuid]
    if (museumProfile === undefined) throw new Error('Player has museum API off.')

    const profileData = PrepareSkyBlockProfileForSkyHelperNetworth(selectedProfile)

    const networthCalculator = new ProfileNetworthCalculator(
      profileData,
      museumProfile,
      selectedProfile.banking.balance
    )

    const networthData = await networthCalculator.getNetworth({ onlyNetworth: true })
    if (networthData.noInventory) return `${givenUsername} has API off`
    const nonCosmeticNetworthData = await networthCalculator.getNonCosmeticNetworth({ onlyNetworth: true })
    if (nonCosmeticNetworthData.noInventory) return `${givenUsername} has API off`

    return `${givenUsername}'s networth: ${shortenNumber(networthData.networth)}, non-cosmetic: ${shortenNumber(nonCosmeticNetworthData.networth)}`
  }
}
