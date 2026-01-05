import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedSkyblock, usernameNotExists } from '../common/utility'

export default class Motes extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['motes', 'mote'], // did mote too bc purse has coins and coin :3
      description: "Returns a player's skyblock rift motes",
      example: `purse %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await context.app.hypixelApi
      .getSkyblockProfiles(uuid)
      .then((profiles) => {
        return profiles?.find((profile) => profile.selected)
      })
      .catch(() => undefined)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const motes = selectedProfile.members[uuid].currencies?.motes_purse

    if (motes === undefined) {
      return context.app.i18n.t(($) => $['commands.motes.none'], { username: context.username })
    }

    return context.app.i18n.t(($) => $['commands.motes.response'], { username: context.username, motesAmount: motes })
  }
}
