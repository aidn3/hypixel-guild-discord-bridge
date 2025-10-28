import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

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
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const bank = selectedProfile.banking.balance
    const purse = selectedProfile.me.currencies.purse

    const totalMessage = shortenNumber(bank + purse)
    const bankMessage = 'Bank ' + shortenNumber(bank)
    const purseMessage = 'Purse ' + shortenNumber(purse)

    return `${givenUsername}'s coins ${totalMessage} - ${bankMessage} - ${purseMessage}`
  }
}
