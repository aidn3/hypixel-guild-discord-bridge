import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility'

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
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid, { raw: true })
      .then((response) => {
        return response.profiles?.find((profile) => profile.selected)
      })
      .catch(() => undefined)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)
    const member = selectedProfile.members[uuid]

    const parts: string[] = []
    parts.push(
      `Skills ${'experience' in member.player_data ? 'ON' : 'OFF'}`,
      `Collection ${'collection' in member ? 'ON' : 'OFF'}`,
      `Inventory ${'inventory' in member ? 'ON' : 'OFF'}`
    )

    const museum = await context.app.hypixelApi
      .getSkyblockMuseum(uuid, selectedProfile.profile_id, { raw: true })
      .catch(() => undefined)
    if (museum === undefined) {
      parts.push(`Museum N/A`)
    } else {
      parts.push(`Museum ${uuid in museum.members ? 'ON' : 'OFF'}`)
    }

    if (Object.keys(selectedProfile.members).length > 1) {
      parts.push(`Personal Bank ${'bank_account' in member.profile ? 'ON' : 'OFF'}`)
    }
    parts.push(`Banking ${'banking' in selectedProfile ? 'ON' : 'OFF'}`)

    return `${givenUsername}: ${parts.join(' - ')}`
  }
}
