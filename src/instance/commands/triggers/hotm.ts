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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    const stats = selectedProfile?.mining_core
    if (stats === undefined) {
      return context.app.i18n.t(($) => $['commands.hotm.none'], { username: givenUsername })
    }

    const hotm = 0 // TODO: Properly reference the value when Hypixel API adds it back
    const mithril = (stats.powder_mithril ?? 0) + (stats.powder_spent_mithril ?? 0)
    const gemstone = (stats.powder_gemstone ?? 0) + (stats.powder_spent_gemstone ?? 0)
    const glacite = (stats.powder_glacite ?? 0) + (stats.powder_spent_glacite ?? 0)

    return context.app.i18n.t(($) => $['commands.hotm.response'], {
      username: givenUsername,
      hotm: hotm,
      mithril: mithril,
      gemstone: gemstone,
      glacite: glacite
    })
  }
}
