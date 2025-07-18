import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getSelectedSkyblockProfile, getUuidIfExists, usernameNotExists } from '../common/utility'

export default class MagicalPower extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['magicalpower', 'mp'],
      description: "Returns a player's highest recorded skyblock Magical Power",
      example: `mp %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    const magicalPower = selectedProfile.highestMagicalPower

    return `${givenUsername}'s highest Magical Power: ${magicalPower}`
  }
}
