import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
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

    // TODO: translatable
    return `${givenUsername} is a ${this.getRank(player)}${this.getTimeWithRank(player)}`
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
    if (player.monthlyPackageRank === 'SUPERSTAR') {
      return ''
    }

    const timestamp =
      player.levelUpMvpPlus ?? player.levelUpMvp ?? player.levelUpVipPlus ?? player.levelUpVip ?? player.firstLogin // if they dont have a rank when they first joined is basically the same

    if (!timestamp) return ''

    const now = Date.now()
    const diffMs = now - timestamp
    if (diffMs <= 0) return ' since just now'

    const seconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const years = Math.floor(days / 365)

    if (years > 0) return ` for the last ${years} year${years === 1 ? '' : 's'}`
    if (weeks > 0) return ` for the last ${weeks} week${weeks === 1 ? '' : 's'}`
    if (days > 0) return ` for the last ${days} day${days === 1 ? '' : 's'}`
    if (hours > 0) return ` for the last ${hours} hour${hours === 1 ? '' : 's'}`
    if (minutes > 0) return ` for the last ${minutes} minute${minutes === 1 ? '' : 's'}`

    return ` for the last ${seconds} second${seconds === 1 ? '' : 's'}`
  }
}
