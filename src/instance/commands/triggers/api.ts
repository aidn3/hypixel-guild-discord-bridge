import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Api extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['api'],
      description: "Returns a player's skyblock API status",
      example: `api %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(givenUsername)

    const parts: string[] = []
    parts.push(
      `Skills ${selectedProfile.me.playerData.skills.combat.xp > 0 ? 'ON' : 'OFF'}`,
      `Collection ${Object.keys(selectedProfile.me.collections).length > 0 ? 'ON' : 'OFF'}`,
      `Inventory ${selectedProfile.me.inventory.inventory.base64 === null ? 'OFF' : 'ON'}`
    )

    const museum = await context.app.hypixelApi
      .getSkyBlockMuseum(selectedProfile.profileId, { raw: true })
      .catch(() => undefined)
    if (museum?.isRaw()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      parts.push(`Museum ${uuid in museum.data.members ? 'ON' : 'OFF'}`)
    } else {
      parts.push(`Museum N/A`)
    }

    parts.push(`Personal Bank ${selectedProfile.me.profileStats.bankAccount > 0 ? 'ON' : 'OFF'}`)
    parts.push(`Banking ${selectedProfile.banking.balance > 0 ? 'ON' : 'OFF'}`)

    return `${givenUsername}: ${parts.join(' - ')}`
  }
}
