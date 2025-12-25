import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber } from '../../../common/helper-functions.js'
import { getUuidIfExists, playerNeverPlayedHypixel, usernameNotExists } from '../common/utility'

export default class Player extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['player'],
      description: 'Get Hypixel player stats.',
      example: `player %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid).catch(() => {
      /* return undefined */
    })
    if (!player) return playerNeverPlayedHypixel(context, givenUsername)

    const guild = await context.app.hypixelApi.getGuild('player', uuid).catch(() => undefined)
    const guildName = guild?.name ?? 'None'

    const rank = player.rank
    const rankPrefix = rank && !['default', 'none'].includes(rank.toLowerCase()) ? `[${rank}] ` : ''

    const level = formatNumber(player.level, 2)
    const karma = formatNumber(player.karma ?? 0, 0)
    const achievementPoints = formatNumber(player.achievementPoints ?? 0, 0)

    return (
      `${rankPrefix}${player.nickname ?? givenUsername}'s level: ${level} | ` +
      `Karma: ${karma} | ` +
      `Achievement Points: ${achievementPoints} | ` +
      `Guild: ${guildName}`
    )
  }
}
