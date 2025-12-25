import { ProfileNetworthCalculator } from 'skyhelper-networth'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber } from '../../../common/helper-functions.js'
import {
  getSelectedSkyblockProfileData,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

interface NetworthTypes {
  museum?: { total?: number }
}

export default class Networth extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['networth', 'nw'],
      description: 'Networth of specified user.',
      example: `networth %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selected = await getSelectedSkyblockProfileData(context.app.hypixelApi, uuid)
    if (!selected) return playerNeverPlayedSkyblock(context, givenUsername)

    const museum = await context.app.hypixelApi
      .getSkyblockMuseum(uuid, selected.profile.profile_id, { raw: true })
      .catch(() => undefined)
    const museumMember = museum?.members?.[uuid]

    const bankingBalance = selected.profile.banking?.balance ?? 0
    const networthManager = new ProfileNetworthCalculator(selected.member, museumMember, bankingBalance)

    const [networthData, nonCosmeticNetworthData] = await Promise.all([
      networthManager.getNetworth({ onlyNetworth: true }),
      networthManager.getNonCosmeticNetworth({ onlyNetworth: true })
    ])

    if (networthData.noInventory) {
      return `${givenUsername} has an Inventory API off!`
    }

    const networth = formatNumber(networthData.networth)
    const unsoulboundNetworth = formatNumber(networthData.unsoulboundNetworth)
    const nonCosmeticNetworth = formatNumber(nonCosmeticNetworthData.networth)
    const nonCosmeticUnsoulboundNetworth = formatNumber(nonCosmeticNetworthData.unsoulboundNetworth)

    const purse = formatNumber(networthData.purse)
    const bank = selected.profile.banking?.balance ? formatNumber(selected.profile.banking.balance) : 'N/A'
    const personalBank = selected.member.profile?.bank_account
      ? formatNumber(selected.member.profile.bank_account)
      : 'N/A'
    const museumTotal = museumMember
      ? formatNumber((networthData as { types?: NetworthTypes }).types?.museum?.total ?? 0)
      : 'N/A'

    return (
      `${givenUsername}'s Networth is ${networth} | ` +
      `Non-Cosmetic Networth: ${nonCosmeticNetworth} | ` +
      `Unsoulbound Networth: ${unsoulboundNetworth} | ` +
      `Non-Cosmetic Unsoulbound Networth: ${nonCosmeticUnsoulboundNetworth} | ` +
      `Purse: ${purse} | ` +
      `Bank: ${bank} + ${personalBank} | ` +
      `Museum: ${museumTotal}`
    )
  }
}
