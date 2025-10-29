import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Timecharms extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['timecharm', 'timecharms', 'charm', 'charms', 'riftcharm', 'riftcharms'],
      description: "Returns a player's rift obtained time charms",
      example: `timecharms %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(givenUsername)

    const trophies = selectedProfile.me.rift.gallery.securedTrophies

    if (trophies.length === 0) {
      return `${givenUsername} has not secured any timecharm yet?`
    }

    let lastCharm = trophies[0]
    for (const trophy of trophies) {
      if (lastCharm.timestamp < trophy.timestamp) lastCharm = trophy
    }

    let displayName: string

    switch (lastCharm.type) {
      case 'wyldly_supreme': {
        displayName = 'Supreme Timecharm (Black Lagoon)'
        break
      }
      case 'chicken_n_egg': {
        displayName = 'Chicken N Egg Timecharm (West Village)'
        break
      }
      case 'mirrored': {
        displayName = 'mrahcemiT esrevrorriM (West Village)'
        break
      }
      case 'citizen': {
        displayName = 'SkyBlock Citizen Timecharm (Village Plaza)'
        break
      }
      case 'lazy_living': {
        displayName = 'Living Timecharm (Living Cave)'
        break
      }
      case 'slime': {
        displayName = 'Globulate Timecharm (Colosseum)'
        break
      }
      case 'vampiric': {
        displayName = 'Vampiric Timecharm (Stillgore Château)'
        break
      }
      case 'mountain': {
        displayName = 'Celestial Timecharm (Cerebral Citadel)'
        break
      }
      default: {
        displayName = 'UNKNOWN timecharm (UNKNOWN)'
      }
    }

    return `${givenUsername} obtained ${displayName} - Total ${trophies.length}`
  }
}
