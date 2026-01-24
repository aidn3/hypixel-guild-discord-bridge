import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { shortenNumber } from '../../../utility/shared-utility'
import { getUuidIfExists, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility'

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

    const bank = selectedProfile.banking?.balance
    const purse = selectedProfile.members[uuid].currencies?.coin_purse

    if (bank === undefined && purse === undefined) {
      return `${givenUsername}'s API is disabled.`
    }

    const totalMessage = shortenNumber((bank ?? 0) + (purse ?? 0))
    const bankMessage = 'Bank ' + (bank === undefined ? 'OFF' : shortenNumber(bank))
    const purseMessage = 'Purse ' + (purse === undefined ? 'OFF' : shortenNumber(purse))

    return `${givenUsername}'s coins ${totalMessage} - ${bankMessage} - ${purseMessage}`
  }
}
