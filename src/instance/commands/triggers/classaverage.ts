import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getDungeonLevelWithOverflow,
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility.js'

export default class ClassAverage extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['classavg', 'ca', 'classaverage'],
      description: "Returns a player's class average (capped and uncapped)",
      example: `classavg %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const username = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, username)
    if (!uuid) return usernameNotExists(context, username)

    const profile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!profile) return playerNeverPlayedSkyblock(context, username)

    const classes = profile.dungeons?.player_classes
    if (!classes) return playerNeverPlayedDungeons(username)

    const healer = getDungeonLevelWithOverflow(classes.healer?.experience ?? 0)
    const mage = getDungeonLevelWithOverflow(classes.mage?.experience ?? 0)
    const berserk = getDungeonLevelWithOverflow(classes.berserk?.experience ?? 0)
    const archer = getDungeonLevelWithOverflow(classes.archer?.experience ?? 0)
    const tank = getDungeonLevelWithOverflow(classes.tank?.experience ?? 0)

    const cappedAvg = (
      (Math.min(healer, 50) + Math.min(mage, 50) + Math.min(berserk, 50) + Math.min(archer, 50) + Math.min(tank, 50)) /
      5
    ).toFixed(2)

    const uncappedAvg = ((healer + mage + berserk + archer + tank) / 5).toFixed(2)

    const anyOverflow = healer > 50 || mage > 50 || berserk > 50 || archer > 50 || tank > 50

    return anyOverflow
      ? context.app.i18n.t(($) => $['commands.classavg.overflow'], {
          username,
          average: cappedAvg,
          overflow: uncappedAvg,
          healer,
          mage,
          berserk,
          archer,
          tank
        })
      : context.app.i18n.t(($) => $['commands.classavg.response'], {
          username,
          average: cappedAvg,
          healer,
          mage,
          berserk,
          archer,
          tank
        })
  }
}
