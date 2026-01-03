import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class HypixelLevel extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['hlevel', 'hypixellevel', 'hlvl'],
      description: "Returns a player's Hypixel common stats",
      example: `hlevel %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    // TODO: translatable
    return `${givenUsername} is Hypixel level ${this.getLevel(player.networkExp ?? 0).toFixed(2)}.`
  }

  private getLevel(experience: number): number {
    const Base = 10_000
    const Growth = 2500
    const ReversePqPrefix = -(Base - 0.5 * Growth) / Growth
    const ReverseConst = ReversePqPrefix * ReversePqPrefix
    const GrowthDivides2 = 2 / Growth

    const result = 1 + ReversePqPrefix + Math.sqrt(ReverseConst + GrowthDivides2 * experience)
    return Math.round(result * 100) / 100
  }
}
