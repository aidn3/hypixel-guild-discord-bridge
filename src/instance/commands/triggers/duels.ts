import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { getUuidIfExists, playerNeverPlayedHypixel, shortenNumber, usernameNotExists } from '../common/utility'

type DuelType =
  | 'blitz'
  | 'uhc'
  | 'parkour'
  | 'boxing'
  | 'bowspleef'
  | 'spleef'
  | 'arena'
  | 'megawalls'
  | 'op'
  | 'sumo'
  | 'classic'
  | 'combo'
  | 'bridge'
  | 'nodebuff'
  | 'bow'

export default class Duels extends ChatCommandHandler {
  private static readonly ValidDuelTypes: readonly DuelType[] = [
    'blitz',
    'uhc',
    'parkour',
    'boxing',
    'bowspleef',
    'spleef',
    'arena',
    'megawalls',
    'op',
    'sumo',
    'classic',
    'combo',
    'bridge',
    'nodebuff',
    'bow'
  ]

  constructor() {
    super({
      triggers: ['duels', 'duel'],
      description: "Returns a player's duels stats with optional mode filter",
      example: `duels [mode] %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const commandArguments = context.args

    // Parse duel type and username from arguments
    const firstArgument = commandArguments[0]?.toLowerCase()
    const isFirstArgumentDuelType = firstArgument && Duels.ValidDuelTypes.includes(firstArgument as DuelType)

    const duelType: DuelType | undefined = isFirstArgumentDuelType ? (firstArgument as DuelType) : undefined
    const givenUsername = isFirstArgumentDuelType
      ? (commandArguments[1] ?? context.username)
      : (commandArguments[0] ?? context.username)

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const player = await context.app.hypixelApi.getPlayer(uuid, {}).catch(() => undefined)
    if (player == undefined) return playerNeverPlayedHypixel(context, givenUsername)

    const stats = player.stats?.duels
    if (stats === undefined) return `${givenUsername} has never played Duels.`

    if (!duelType) {
      // Overall stats
      const division = (stats as unknown as { division?: string }).division ?? 'Unknown'
      const wins = stats.wins
      const winstreak = stats.winstreak
      const bestWinstreak = stats.bestWinstreak
      const wlRatio = stats.WLRatio

      return (
        `[Duels] [${division}] ${givenUsername} ` +
        `W: ${shortenNumber(wins)} | CWS: ${winstreak} | BWS: ${bestWinstreak} | WLR: ${wlRatio.toFixed(2)}`
      )
    }

    // Mode-specific stats
    const modeData = (stats as unknown as Record<string, unknown>)[duelType]
    if (!modeData || typeof modeData !== 'object') {
      return `${givenUsername} has no ${duelType.toUpperCase()} duels stats.`
    }

    const firstKey = Object.keys(modeData)[0]
    const duelData = firstKey ? (modeData as Record<string, unknown>)[firstKey] : modeData
    const dataObject = (typeof duelData === 'object' && duelData !== null ? duelData : modeData) as Record<
      string,
      unknown
    >

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive for dynamic data
    const division = (dataObject.division as string) ?? 'Unknown'
    const wins = dataObject.wins as number
    const winstreak = dataObject.winstreak as number
    const bestWinstreak = dataObject.bestWinstreak as number
    const wlRatio = dataObject.WLRatio as number

    return (
      `[${duelType.toUpperCase()}] [${division}] ${givenUsername} ` +
      `W: ${shortenNumber(wins)} | CWS: ${winstreak} | BWS: ${bestWinstreak} | WLR: ${wlRatio.toFixed(2)}`
    )
  }
}
