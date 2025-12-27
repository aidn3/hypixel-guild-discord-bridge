import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverEnteredCrimson,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Dojo extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['dojo'],
      description: "Returns a player's crimson isle's Dojo stats",
      example: `rep %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (selectedProfile.nether_island_player_data === undefined) {
      return playerNeverEnteredCrimson(givenUsername)
    }

    const stats = selectedProfile.nether_island_player_data.dojo
    if (stats === undefined) {
      return context.app.i18n.t(($) => $['commands.error.never-played-dojo'], { username: givenUsername })
    }

    const parts: string[] = []
    const total =
      (stats.dojo_points_mob_kb ?? 0) +
      (stats.dojo_points_wall_jump ?? 0) +
      (stats.dojo_points_archer ?? 0) +
      (stats.dojo_points_sword_swap ?? 0) +
      (stats.dojo_points_snake ?? 0) +
      (stats.dojo_points_lock_head ?? 0) +
      (stats.dojo_points_fireball ?? 0)

    parts.push(`Total ${total}`)
    parts.push(`Force ${stats.dojo_points_mob_kb ?? 0}`)
    parts.push(`Stamina ${stats.dojo_points_wall_jump ?? 0}`)
    parts.push(`Mastery ${stats.dojo_points_archer ?? 0}`)
    parts.push(`Discipline ${stats.dojo_points_sword_swap ?? 0}`)
    parts.push(`Swiftness ${stats.dojo_points_snake ?? 0}`)
    parts.push(`Control ${stats.dojo_points_lock_head ?? 0}`)
    parts.push(`Tenacity ${stats.dojo_points_fireball ?? 0}`)

    return `${givenUsername} Dojo: \n${parts.join('\n - ')}`
  }
}
