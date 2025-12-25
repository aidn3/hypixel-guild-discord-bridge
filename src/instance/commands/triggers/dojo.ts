import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber } from '../../../common/helper-functions.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverEnteredCrimson,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

type DojoData = Record<string, number | undefined>

export default class Dojo extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['dojo'],
      description: "Returns a player's dojo stats",
      example: `dojo %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (!selectedProfile.nether_island_player_data) return playerNeverEnteredCrimson(givenUsername)

    const dojo = (selectedProfile.nether_island_player_data as { dojo?: DojoData }).dojo ?? {}
    const totalPoints = Object.entries(dojo).reduce((total, [key, value]) => {
      if (!key.startsWith('dojo_points') || value === undefined) return total
      return total + value
    }, 0)

    const belt = Dojo.getBelt(totalPoints)
    const force = dojo.dojo_points_mob_kb ?? 0
    const stamina = dojo.dojo_points_wall_jump ?? 0
    const mastery = dojo.dojo_points_archer ?? 0
    const discipline = dojo.dojo_points_sword_swap ?? 0
    const swiftness = dojo.dojo_points_snake ?? 0
    const control = dojo.dojo_points_lock_head ?? 0
    const tenacity = dojo.dojo_points_fireball ?? 0

    return (
      `${givenUsername}'s Belt: ${belt} | ` +
      `Best Force: ${formatNumber(force)} | ` +
      `Best Stamina: ${formatNumber(stamina)} | ` +
      `Best Mastery: ${formatNumber(mastery)} | ` +
      `Best Discipline: ${formatNumber(discipline)} | ` +
      `Best Swiftness: ${formatNumber(swiftness)} | ` +
      `Best Control: ${formatNumber(control)} | ` +
      `Best Tenacity: ${formatNumber(tenacity)}`
    )
  }

  private static getBelt(points: number): string {
    if (points >= 7000) return 'Black'
    if (points >= 6000) return 'Brown'
    if (points >= 4000) return 'Blue'
    if (points >= 2000) return 'Green'
    if (points >= 1000) return 'Yellow'
    return 'White'
  }
}
