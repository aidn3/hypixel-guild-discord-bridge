import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getSelectedSkyblockProfile, getUuidIfExists, usernameNotExists } from '../common/utility'

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
    const hotm = selectedProfile.hotm

    let response = `${givenUsername} is HOTM ${hotm.experience.level}`

    const powders: string[] = []
    if (hotm.powder.mithril.total > 0)
      powders.push(`${(hotm.powder.mithril.current + hotm.powder.mithril.spent).toLocaleString('en-US')} Mithril`)
    if (hotm.powder.gemstone.total > 0)
      powders.push(`${(hotm.powder.gemstone.current + hotm.powder.gemstone.spent).toLocaleString('en-US')} Gemstone`)
    if (hotm.powder.glacite.total > 0)
      powders.push(`${(hotm.powder.glacite.current + hotm.powder.glacite.spent).toLocaleString('en-US')} Glacite`)
    if (powders.length > 0) response += ` with powders (${powders.join(' - ')})`

    return response
  }
}
