import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class MagicalPower extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['magicalpower', 'mp', 'power'],
      description: "Returns a player's highest recorded skyblock Magical Power",
      example: `mp %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    if (selectedProfile.me.inventory.inventory.base64 === null) {
      throw new Error(`${givenUsername} has inventory API off`)
    }

    const decoded = await selectedProfile.me.inventory.bags.talisman.decodeData()
    if (!decoded) throw new Error("Something wen't wrong while decoding the user's data")

    const magicalPower = decoded.magicalPower
    const stone = selectedProfile.me.accessoryBag.selectedPower ?? '(none)'

    let result = `${givenUsername}:`
    result += ` MP ${magicalPower}`
    result += ` | Stone: ${stone}`

    return result
  }
}
