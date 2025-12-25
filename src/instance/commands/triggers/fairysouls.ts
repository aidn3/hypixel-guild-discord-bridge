import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileData,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class FairySouls extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['fairysouls', 'fs'],
      description: 'Fairy Souls of specified user.',
      example: `fairysouls %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selected = await getSelectedSkyblockProfileData(context.app.hypixelApi, uuid)
    if (!selected) return playerNeverPlayedSkyblock(context, givenUsername)

    const total = selected.profile.game_mode === 'island' ? 5 : 253
    const fairySouls = selected.member.fairy_soul
    if (!fairySouls) return `${givenUsername} has no fairy soul data or API is off.`

    const collected = fairySouls.total_collected ?? 0
    const progress = total > 0 ? (collected / total) * 100 : 0

    return `${givenUsername}'s Fairy Souls: ${collected} / ${total} | Progress: ${progress.toFixed(2)}%`
  }
}
