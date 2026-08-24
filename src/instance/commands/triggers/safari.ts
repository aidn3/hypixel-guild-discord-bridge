import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class Safari extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'safari',
      triggers: ['safari', 'critters'],
      description: 'Returns caught critters per zone',
      example: `safari %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const safari = selectedProfile.safari

    if (safari == undefined) return context.app.i18n.t(($) => $['commands.safari.none'], { username: givenUsername })

    const biome = safari.biome_captures

    const icy = biome?.icy ?? 0
    const cavern = biome?.cavern ?? 0
    const forest = biome?.forest ?? 0
    const haunted = biome?.haunted ?? 0
    const total = icy + cavern + forest + haunted

    return context.app.i18n.t(($) => $['commands.safari.response'], {
      username: givenUsername,
      icy,
      cavern,
      forest,
      haunted,
      total
    })
  }
}
