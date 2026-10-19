import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  hypixelApiNotSet,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Chocobits extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'chocobits',
      triggers: ['chocobits'],
      description: "Returns a player's chocobits",
      example: `chocobits %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const hypixel = context.app.hypixel()
    if (hypixel === undefined) return hypixelApiNotSet(context)
    const selectedProfile = await getSelectedSkyblockProfile(hypixel, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const easter = selectedProfile.events?.easter
    const chocobits = easter?.chocobits
    if (!chocobits)
      return context.app.i18n.t(($) => $['commands.chocobits.none'], {
        username: givenUsername
      })
    const totalChocobits = chocobits.total_found ?? 0

    const owned = chocobits.owned ?? []
    const currentChocobits = owned.length
    if (currentChocobits == 0)
      return context.app.i18n.t(($) => $['commands.chocobits.no-current'], {
        username: givenUsername,
        total: totalChocobits
      })

    const ids = owned.slice(0, 15).map((chocobit) => chocobit.id)
    const remaining = owned.length - ids.length

    const idString = ids.join(', ') + (remaining > 0 ? `, and ${remaining} more` : '')

    return context.app.i18n.t(($) => $['commands.chocobits.response'], {
      username: givenUsername,
      current: currentChocobits,
      total: totalChocobits,
      ids: idString
    })
  }
}
