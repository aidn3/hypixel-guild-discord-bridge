import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { SkyblockDungeons } from '../../../core/hypixel/hypixel-skyblock-types'
import {
  getDungeonLevelWithOverflow,
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Catacombs extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['catacombs', 'catacomb', 'cata', 'dungeons', 'dungeon'],
      description: "Returns a player's catacombs level",
      example: `cata %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const hypixelProfile = await context.app.hypixelApi.getPlayer(uuid)
    assert.ok(hypixelProfile !== undefined)

    const dungeons = selectedProfile.dungeons
    if (!dungeons) {
      return playerNeverPlayedDungeons(givenUsername)
    }

    const skillLevel = getDungeonLevelWithOverflow(dungeons.dungeon_types.catacombs.experience)
    const secrets = selectedProfile.dungeons?.secrets ?? 0

    const healer = getDungeonLevelWithOverflow(dungeons.player_classes?.healer?.experience ?? 0)
    const mage = getDungeonLevelWithOverflow(dungeons.player_classes?.mage?.experience ?? 0)
    const berserk = getDungeonLevelWithOverflow(dungeons.player_classes?.berserk?.experience ?? 0)
    const archer = getDungeonLevelWithOverflow(dungeons.player_classes?.archer?.experience ?? 0)
    const tank = getDungeonLevelWithOverflow(dungeons.player_classes?.tank?.experience ?? 0)

    const classAvg = (
      (Math.min(healer, 50) + Math.min(mage, 50) + Math.min(berserk, 50) + Math.min(archer, 50) + Math.min(tank, 50)) /
      5
    ).toFixed(2)

    const uncappedClassAvg = ((healer + mage + berserk + archer + tank) / 5).toFixed(2)

    const anyOverflow = healer > 50 || mage > 50 || berserk > 50 || archer > 50 || tank > 50

    return anyOverflow
      ? context.app.i18n.t(($) => $['commands.catacombs.overflow-class-avg'], {
          username: givenUsername,
          cata: skillLevel,
          class: this.formatClass(dungeons),
          secrets,
          classAvg,
          uncappedClassAvg
        })
      : context.app.i18n.t(($) => $['commands.catacombs.response'], {
          username: givenUsername,
          cata: skillLevel,
          class: this.formatClass(dungeons),
          secrets,
          classAvg
        })
  }

  private formatClass(dungeon: SkyblockDungeons): string {
    const classes = dungeon.player_classes

    let xp = 0
    let name = '(None)'

    if (classes?.healer?.experience && classes.healer.experience > xp) {
      xp = classes.healer.experience
      name = 'Healer'
    }
    if (classes?.mage?.experience && classes.mage.experience > xp) {
      xp = classes.mage.experience
      name = 'Mage'
    }
    if (classes?.berserk?.experience && classes.berserk.experience > xp) {
      xp = classes.berserk.experience
      name = 'Berserk'
    }
    if (classes?.archer?.experience && classes.archer.experience > xp) {
      xp = classes.archer.experience
      name = 'Archer'
    }
    if (classes?.tank?.experience && classes.tank.experience > xp) {
      xp = classes.tank.experience
      name = 'Tank'
    }
    return `${name} ${getDungeonLevelWithOverflow(xp).toFixed(2)}`
  }
}
