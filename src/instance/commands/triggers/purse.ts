import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedSkyblock, shortenNumber, usernameNotExists } from '../common/utility'

export default class Purse extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['purse', 'bank', 'coins', 'coin'],
      description: "Returns a player's skyblock coins",
      example: `purse %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid)
      .then((profiles) => {
        return profiles?.find((profile) => profile.selected)
      })
      .catch(() => undefined)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const sharedBank = selectedProfile.banking?.balance
    const personalBank = selectedProfile.members[uuid].profile.bank_account
    const purse = selectedProfile.members[uuid].currencies?.coin_purse

    if (sharedBank === undefined && personalBank === undefined && purse === undefined) {
      return context.app.i18n.t(($) => $['commands.purse.api-disabled'], { username: givenUsername })
    }

    const off = context.app.i18n.t(($) => $['api-off'])

    return context.app.i18n.t(($) => $['commands.purse.response'], {
      username: givenUsername,
      total: shortenNumber((sharedBank ?? 0) + (personalBank ?? 0) + (purse ?? 0)),
      sharedBank: sharedBank === undefined ? off : shortenNumber(sharedBank),
      personalBank: personalBank === undefined ? off : shortenNumber(personalBank),
      purse: purse === undefined ? off : shortenNumber(purse)
    })
  }
}
