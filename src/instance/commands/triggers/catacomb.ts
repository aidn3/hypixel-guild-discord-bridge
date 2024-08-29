import type { SkyblockV2Dungeons } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../common/command-interface.js'
import { ChatCommandHandler } from '../common/command-interface.js'
import { getDungeonLevelWithOverflow, getSelectedSkyblockProfileRaw, getUuidIfExists } from '../common/util.js'

export default class Catacomb extends ChatCommandHandler {
  constructor() {
    super({
      name: 'Catacombs',
      triggers: ['catacomb', 'catacombs', 'cata'],
      description: "Returns a player's catacombs level",
      example: `cata %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) {
      return `No such username! (given: ${givenUsername})`
    }

    const parsedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    const dungeons = parsedProfile.dungeons
    const skillLevel = getDungeonLevelWithOverflow(dungeons.dungeon_types.catacombs.experience)

    return `${givenUsername} is Catacombs ${skillLevel.toFixed(2)} ${this.formatClass(dungeons)}.`
  }

  private formatClass(dungeon: SkyblockV2Dungeons): string {
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
