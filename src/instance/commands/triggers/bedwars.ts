import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import {
  capitalize,
  getUuidIfExists,
  playerNeverPlayedHypixel,
  shortenNumber,
  usernameNotExists
} from '../common/utility'

type BedwarsMode = 'overall' | 'solo' | 'doubles' | 'threes' | 'fours' | '4v4'

export default class Bedwars extends ChatCommandHandler {
  private static readonly ValidModes: readonly BedwarsMode[] = ['overall', 'solo', 'doubles', 'threes', 'fours', '4v4']
  constructor() {
    super({
      triggers: ['bedwars', 'bw', 'bws'],
      description: "Returns a player's bedwars stats with optional mode filter",
      example: `bw [mode] %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const commandArguments = context.args

    // Parse mode and username from arguments
    const firstArgument = commandArguments[0]?.toLowerCase()
    const isFirstArgumentMode = firstArgument && Bedwars.ValidModes.includes(firstArgument as BedwarsMode)

    const mode: BedwarsMode = isFirstArgumentMode ? (firstArgument as BedwarsMode) : 'overall'
    const givenUsername = isFirstArgumentMode
      ? (commandArguments[1] ?? context.username)
      : (commandArguments[0] ?? context.username)

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => {
      /* return undefined */
    })
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.bedwars
    if (stats === undefined) return `${givenUsername} has never played Bedwars before?`

    // Get mode-specific or overall stats
    const modeStats = mode === 'overall' ? stats : (stats as unknown as Record<string, unknown>)[mode]
    if (modeStats === undefined) {
      return `${givenUsername} has no ${capitalize(mode)} Bedwars stats.`
    }

    // Extract stats based on mode
    const level = stats.level
    const finalKills = this.getStat(modeStats, 'finalKills') ?? 0
    const finalKDRatio = this.getStat(modeStats, 'finalKDRatio') ?? 0
    const wins = this.getStat(modeStats, 'wins') ?? 0
    const wlRatio = this.getStat(modeStats, 'WLRatio') ?? 0
    const bedsBroken = this.getStat(modeStats, 'beds', 'broken') ?? 0
    const blRatio = this.getStat(modeStats, 'beds', 'BLRatio') ?? 0
    const winstreak = this.getStat(modeStats, 'winstreak') ?? 0

    const modePrefix = mode === 'overall' ? '' : `${capitalize(mode)} `

    return (
      `[${level.toFixed(0)}✫] ${givenUsername} ${modePrefix}` +
      `FK: ${shortenNumber(finalKills)} FKDR: ${finalKDRatio.toFixed(2)} ` +
      `W: ${shortenNumber(wins)} WLR: ${wlRatio.toFixed(2)} ` +
      `BB: ${shortenNumber(bedsBroken)} BLR: ${blRatio.toFixed(2)} ` +
      `WS: ${winstreak}`
    )
  }

  private getStat(object: unknown, ...keys: string[]): number | undefined {
    let current: unknown = object
    for (const key of keys) {
      if (current === null || typeof current !== 'object') return undefined
      current = (current as Record<string, unknown>)[key]
    }
    return typeof current === 'number' ? current : undefined
  }
}
