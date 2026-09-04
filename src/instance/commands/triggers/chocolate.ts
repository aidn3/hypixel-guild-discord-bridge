import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import { shortenNumber } from '../../../utility/shared-utility.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Chocolate extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'chocolate',
      triggers: ['chocolate', 'chocolates', 'cf'],
      description: "Returns a player's SkyBlock easter eggs chocolate stats",
      example: `chocolate %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const easter = selectedProfile.events?.easter
    const totalChocolate = easter?.total_chocolate ?? 0
    const chocolateSpent = easter?.shop?.chocolate_spent ?? 0
    const selectedFaction = easter?.rabbits.selected_faction
    if (totalChocolate === 0)
      return context.app.i18n.t(($) => $['commands.chocolate.none'], {
        username: givenUsername
      })

    if (selectedFaction) {
      const faction = selectedFaction.toLowerCase()

      return context.app.i18n.t(($) => $['commands.chocolate.faction'], {
        username: givenUsername,
        faction,
        totalChocolate: shortenNumber(totalChocolate),
        chocolateSpent: shortenNumber(chocolateSpent)
      })
    }

    return context.app.i18n.t(($) => $['commands.chocolate.response'], {
      username: givenUsername,
      totalChocolate: shortenNumber(totalChocolate),
      chocolateSpent: shortenNumber(chocolateSpent)
    })
  }
}
