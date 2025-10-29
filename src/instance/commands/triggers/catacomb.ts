import type { SkyBlockMemberDungeonsClasses } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getDungeonLevelWithOverflow,
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Catacomb extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['catacomb', 'catacombs', 'cata'],
      description: "Returns a player's catacombs level",
      example: `cata %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    return `${givenUsername} is Catacombs ${selectedProfile.me.dungeons.level.level.toFixed(2)} ${this.formatClass(selectedProfile.me.dungeons.classes)}.`
  }

  private formatClass(classes: SkyBlockMemberDungeonsClasses): string {
    let xp = 0
    let name = '(None)'

    if (classes.healer.xp > xp) {
      xp = classes.healer.xp
      name = 'Healer'
    }
    if (classes.mage.xp > xp) {
      xp = classes.mage.xp
      name = 'Mage'
    }
    if (classes.berserk.xp > xp) {
      xp = classes.berserk.xp
      name = 'Berserk'
    }
    if (classes.archer.xp > xp) {
      xp = classes.archer.xp
      name = 'Archer'
    }
    if (classes.tank.xp > xp) {
      xp = classes.tank.xp
      name = 'Tank'
    }
    return `${name} ${getDungeonLevelWithOverflow(xp).toFixed(2)}`
  }
}
