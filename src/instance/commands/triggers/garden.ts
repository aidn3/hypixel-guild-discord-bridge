import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Garden extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['garden'],
      description: "Returns a player's garden stats",
      example: `garden %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    let selectedProfile
    try {
      selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    } catch {
      return playerNeverPlayedSkyblock(context, givenUsername)
    }

    const garden = selectedProfile.garden
    if (!garden) return `${givenUsername} does not have a garden.`

    const crops = garden.cropMilestones
    return (
      `${givenUsername}'s Garden ${garden.level.level} | Crop Milestones: ` +
      `Wheat: ${crops.wheat.level} | ` +
      `Carrot: ${crops.carrot.level} | ` +
      `Cane: ${crops.sugarCane.level} | ` +
      `Potato: ${crops.potato.level} | ` +
      `Wart: ${crops.netherWart.level} | ` +
      `Pumpkin: ${crops.pumpkin.level} | ` +
      `Melon: ${crops.melon.level} | ` +
      `Mushroom: ${crops.mushroom.level} | ` +
      `Cocoa: ${crops.cocoaBeans.level} | ` +
      `Cactus: ${crops.cactus.level}`
    )
  }
}
