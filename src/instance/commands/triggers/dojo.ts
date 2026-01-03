import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
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

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (selectedProfile.nether_island_player_data === undefined) {
      return playerNeverEnteredCrimson(givenUsername)
    }

    const stats = selectedProfile.nether_island_player_data.dojo
    if (stats === undefined) {
      return context.app.i18n.t(($) => $['commands.dojo.none'], { username: givenUsername })
    }

    const total =
      (stats.dojo_points_mob_kb ?? 0) +
      (stats.dojo_points_wall_jump ?? 0) +
      (stats.dojo_points_archer ?? 0) +
      (stats.dojo_points_sword_swap ?? 0) +
      (stats.dojo_points_snake ?? 0) +
      (stats.dojo_points_lock_head ?? 0) +
      (stats.dojo_points_fireball ?? 0)

    return context.app.i18n.t(($) => $['commands.dojo.response'], {
      username: givenUsername,
      total: total,
      force: stats.dojo_points_mob_kb ?? 0,
      stamina: stats.dojo_points_wall_jump ?? 0,
      mastery: stats.dojo_points_archer ?? 0,
      discipline: stats.dojo_points_sword_swap ?? 0,
      swiftness: stats.dojo_points_snake ?? 0,
      control: stats.dojo_points_lock_head ?? 0,
      tenacity: stats.dojo_points_fireball ?? 0
    })
  }
}
