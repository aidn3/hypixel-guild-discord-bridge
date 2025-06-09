import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getSelectedSkyblockProfile, getUuidIfExists, usernameNotExists } from '../common/util.js'

export default class HeartOfTheMountain extends ChatCommandHandler {
  constructor() {
    super({
      name: 'hotm',
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

    let response = `${givenUsername} is hotm ${hotm.experience.level}`

    const powders: string[] = []
    if (hotm.powder.mithril.total > 0) powders.push(`${hotm.powder.mithril.total.toLocaleString('en-US')} mithril`)
    if (hotm.powder.gemstone.total > 0) powders.push(`${hotm.powder.gemstone.total.toLocaleString('en-US')} gemstone`)
    if (hotm.powder.glacite.total > 0) powders.push(`${hotm.powder.glacite.total.toLocaleString('en-US')} galacite`)
    if (powders.length > 0) response += ` with (${powders.join(' | ')})`

    return response
  }
}
