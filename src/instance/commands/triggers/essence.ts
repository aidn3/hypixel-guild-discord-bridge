import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Essence extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['essence', 'ess'],
      description: "Returns a player's essence perks",
      example: `essence %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const essencePerks = selectedProfile.essence?.perks
    if (!essencePerks) return `${givenUsername} has no essence perks.`

    const perks: string[] = []
    if (essencePerks.cold_efficiency) perks.push(`Cold Eff: ${essencePerks.cold_efficiency}`)
    if (essencePerks.heart_of_gold) perks.push(`Heart Gold: ${essencePerks.heart_of_gold}`)
    if (essencePerks.diamond_in_the_rough) perks.push(`Diamond: ${essencePerks.diamond_in_the_rough}`)
    if (essencePerks.toxophilite) perks.push(`Toxophilite: ${essencePerks.toxophilite}`)
    if (essencePerks.unbridled_rage) perks.push(`Rage: ${essencePerks.unbridled_rage}`)

    if (perks.length === 0) return `${givenUsername} has no essence perks unlocked.`

    return `${givenUsername}'s Essence Perks: ${perks.join(' | ')}`
  }
}
