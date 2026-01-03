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
    const secrets = hypixelProfile.achievements?.skyblock_treasure_hunter ?? 0

    return `${givenUsername} is Catacombs ${skillLevel.toFixed(2)} - ${this.formatClass(dungeons)} - Secrets ${secrets.toLocaleString('en-US')}.`
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
