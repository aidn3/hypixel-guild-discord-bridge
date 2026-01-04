import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
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

    const rawPlayer = await context.app.hypixelApi.getPlayer(uuid)
    if (rawPlayer == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const player = {
      ...rawPlayer,
      levelUpVip: rawPlayer.levelUp_VIP,
      levelUpVipPlus: rawPlayer.levelUp_VIP_PLUS,
      levelUpMvp: rawPlayer.levelUp_MVP,
      levelUpMvpPlus: rawPlayer.levelUp_MVP_PLUS
    }
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

  private getRank(player: { newPackageRank?: string | null; monthlyPackageRank?: string | null }): string {
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

  private getTimeWithRank(player: {
    levelUpVip?: number | null
    levelUpVipPlus?: number | null
    levelUpMvp?: number | null
    levelUpMvpPlus?: number | null
    firstLogin?: number | null
    monthlyPackageRank?: string | null
  }): string {
    // mvp++ doesnt have a timestamp as far as i can tell :/
    if (player.monthlyPackageRank === 'SUPERSTAR') return ''

    // if they dont have a rank when they first joined is basically the same
    const timestamp =
      player.levelUpMvpPlus ?? player.levelUpMvp ?? player.levelUpVipPlus ?? player.levelUpVip ?? player.firstLogin

    if (!timestamp) return ''

    return formatTime(Date.now() - timestamp)
  }
}
