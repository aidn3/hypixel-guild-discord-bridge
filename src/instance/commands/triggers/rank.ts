import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { HypixelPlayer } from '../../../core/hypixel/hypixel-player'
import { formatTime } from '../../../utility/shared-utility'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Rank extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['rank'],
      description: 'shows the rank of a player',
      example: `rank %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    if (player.monthlyPackageRank === 'SUPERSTAR')
      return context.app.i18n.t(($) => $['commands.rank.mvpplusplus'], {
        username: context.username,
        rank: this.getRank(player)
      })

    return context.app.i18n.t(($) => $['commands.rank.response'], {
      username: context.username,
      rank: this.getRank(player),
      timeAsRank: this.getTimeWithRank(player)
    })
  }

  private getRank(player: HypixelPlayer): string {
    if (player.monthlyPackageRank === 'SUPERSTAR') {
      return 'MVP++'
    }
    if (player.newPackageRank === 'NONE') return 'Non (no rank)'
    if (player.newPackageRank === 'VIP') return 'VIP'
    if (player.newPackageRank === 'VIP_PLUS') return 'VIP+'
    if (player.newPackageRank === 'MVP') return 'MVP'
    if (player.newPackageRank === 'MVP_PLUS') return 'MVP+'
    return 'Non (no rank)'
  }

  private getTimeWithRank(player: HypixelPlayer): string {
    /*
     * mvp++ does not have a timestamp as far as I can tell.
     * This can be due to hypixel policy to not disclose any monetization information:
     * @see https://github.com/HypixelDev/PublicAPI/discussions/542#discussioncomment-2797086
     */
    if (player.monthlyPackageRank === 'SUPERSTAR') return ''

    // if they do not have a rank when they first joined is basically the same
    const timestamp =
      player.levelUp_MVP_PLUS ??
      player.levelUp_MVP ??
      player.levelUp_VIP_PLUS ??
      player.levelUp_VIP ??
      player.firstLogin

    if (!timestamp) return ''

    return formatTime(Date.now() - timestamp)
  }
}
