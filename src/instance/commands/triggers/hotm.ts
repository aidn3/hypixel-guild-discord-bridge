import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class HeartOfTheMountain extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['hotm', 'powder'],
      description: "Returns a player's hotm and powder",
      example: `hotm %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    let response = `${givenUsername} is HOTM ${selectedProfile.me.mining.hotm.level.level}`

    const powders: string[] = []
    if (selectedProfile.me.mining.powder.mithril.total > 0)
      powders.push(
        `${(selectedProfile.me.mining.powder.mithril.powder + selectedProfile.me.mining.powder.mithril.spent).toLocaleString('en-US')} Mithril`
      )
    if (selectedProfile.me.mining.powder.gemstone.total > 0)
      powders.push(
        `${(selectedProfile.me.mining.powder.gemstone.powder + selectedProfile.me.mining.powder.gemstone.spent).toLocaleString('en-US')} Gemstone`
      )
    if (selectedProfile.me.mining.powder.glacite.total > 0)
      powders.push(
        `${(selectedProfile.me.mining.powder.glacite.powder + selectedProfile.me.mining.powder.glacite.spent).toLocaleString('en-US')} Glacite`
      )
    if (powders.length > 0) response += ` with powders (${powders.join(' - ')})`

    return response
  }
}
