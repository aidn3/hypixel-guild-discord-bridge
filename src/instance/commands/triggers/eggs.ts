import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  getSelectedSkyblockProfileRaw,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

export default class Eggs extends ChatCommandHandler {
  private static readonly DivineEggs = ['vega', 'starfire', 'orion', 'aurora', 'celestia']
  private static readonly MythicEggs = [
    'dante',
    'einstein',
    'king',
    'galaxy',
    'zorro',
    'mu',
    'napoleon',
    'sigma',
    'omega',
    'zest_zephyr',
    'zeta'
  ]
  constructor() {
    super({
      triggers: ['eggs', 'egg'],
      description: "Returns a player's skyblock easter eggs stats",
      example: `eggs %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfileRaw(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    const easter = selectedProfile.events?.easter
    const totalChocolate = easter?.total_chocolate ?? 0
    if (totalChocolate === 0) return `${givenUsername} does not have a chocolate factory.`

    let totalEggs = 0
    let uniqueEggs = 0
    let mythicEggs = 0
    let divineEggs = 0
    if (easter?.rabbits !== undefined) {
      for (const RabbitEggCount of Object.values(easter.rabbits)) {
        if (typeof RabbitEggCount === 'number') {
          totalEggs += RabbitEggCount
          uniqueEggs++
        }
      }

      for (const mythicEgg of Eggs.MythicEggs) {
        const count = easter.rabbits[mythicEgg] as undefined | number
        if ((count ?? 0) > 0) {
          mythicEggs++
        }
      }
      for (const divineEgg of Eggs.DivineEggs) {
        if (((easter.rabbits[divineEgg] as undefined | number) ?? 0) > 0) {
          divineEggs++
        }
      }
    }

    return `${givenUsername} has collected ${totalEggs} chocolate eggs and unlocked ${mythicEggs} mythics and ${divineEggs} divines for a total of ${uniqueEggs}/512 rabbits`
  }
}
