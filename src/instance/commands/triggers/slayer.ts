import type { SkyblockV2Member, Slayer } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber, titleCase } from '../../../common/helper-functions.js'
import {
  getSelectedSkyblockProfileData,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  playerNeverPlayedSlayers,
  usernameNotExists
} from '../common/utility'

const SlayerTypes = ['zombie', 'spider', 'wolf', 'enderman', 'blaze', 'vampire'] as const
type SlayerType = (typeof SlayerTypes)[number]

const SlayerXpTable: Record<SlayerType, number[]> = {
  zombie: [5, 15, 200, 1000, 5000, 20_000, 100_000, 400_000, 1_000_000],
  spider: [5, 25, 200, 1000, 5000, 20_000, 100_000, 400_000, 1_000_000],
  wolf: [5, 30, 250, 1500, 5000, 20_000, 100_000, 400_000, 1_000_000],
  enderman: [10, 30, 250, 1500, 5000, 20_000, 100_000, 400_000, 1_000_000],
  blaze: [10, 30, 250, 1500, 5000, 20_000, 100_000, 400_000, 1_000_000],
  vampire: [20, 75, 240, 840, 2400]
}

interface SlayerLevel {
  xp: number
  level: number
  xpForNext: number
  progress: number
  totalKills: number
  kills: Record<string, number>
}

type SlayerSummary = Record<SlayerType, SlayerLevel>

export default class SlayerCommand extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['slayer', 'slayers'],
      description: 'Slayer of specified user.',
      example: `slayer %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const slayerType = this.parseSlayerType(context.args[1])

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selected = await getSelectedSkyblockProfileData(context.app.hypixelApi, uuid)
    if (!selected) return playerNeverPlayedSkyblock(context, givenUsername)

    const slayerData = getSlayerSummary(selected.member)
    if (!slayerData) return playerNeverPlayedSlayers(givenUsername)

    if (slayerType) {
      const data = slayerData[slayerType]
      return (
        `${givenUsername}'s ${titleCase(slayerType)} - ${data.level} Levels | ` + `Experience: ${formatNumber(data.xp)}`
      )
    }

    const summary = SlayerTypes.map((type) => {
      const data = slayerData[type]
      return `${titleCase(type)}: ${data.level} (${formatNumber(data.xp)})`
    }).join(' | ')

    return `${givenUsername}'s Slayer: ${summary}`
  }

  private parseSlayerType(value: string | undefined): SlayerType | undefined {
    if (!value) return undefined
    const normalized = value.toLowerCase()
    return SlayerTypes.find((type) => type === normalized)
  }
}

function getSlayerSummary(profile: SkyblockV2Member): SlayerSummary | null {
  if (!profile.slayer?.slayer_bosses) return null

  return {
    zombie: getSlayerLevel(profile, 'zombie'),
    spider: getSlayerLevel(profile, 'spider'),
    wolf: getSlayerLevel(profile, 'wolf'),
    enderman: getSlayerLevel(profile, 'enderman'),
    blaze: getSlayerLevel(profile, 'blaze'),
    vampire: getSlayerLevel(profile, 'vampire')
  }
}

function getSlayerLevel(profile: SkyblockV2Member, slayer: SlayerType): SlayerLevel {
  const slayerData = profile.slayer?.slayer_bosses?.[slayer]
  const experience = slayerData?.xp ?? 0
  const xpTable = SlayerXpTable[slayer]

  if (experience <= 0) {
    return {
      xp: 0,
      level: 0,
      xpForNext: xpTable[0] ?? 0,
      progress: 0,
      totalKills: 0,
      kills: {}
    }
  }

  let level = 0
  for (const [index, element] of xpTable.entries()) {
    if (element <= experience) level = index + 1
  }

  const maxLevel = xpTable.length
  const xpForNext = level < maxLevel ? Math.ceil(xpTable[level]) : 0
  const progress = xpForNext === 0 ? 0 : Math.max(0, Math.min(experience / xpForNext, 1))

  const { totalKills, kills } = getSlayerKills(slayerData, slayer)

  return {
    xp: experience,
    totalKills,
    level,
    xpForNext,
    progress,
    kills
  }
}

function getSlayerKills(
  slayerData: Slayer | undefined,
  slayer: SlayerType
): { totalKills: number; kills: Record<string, number> } {
  const kills: Record<string, number> = {}
  let total = 0

  if (slayer === 'zombie') kills['5'] = 0
  if (!slayerData) return { totalKills: total, kills }

  for (const [key, value] of Object.entries(slayerData)) {
    if (!key.startsWith('boss_kills_tier_')) continue
    const tier = Number.parseInt(key.slice(-1), 10)
    if (Number.isNaN(tier)) continue

    const killCount = typeof value === 'number' ? value : 0
    total += killCount
    kills[(tier + 1).toString()] = killCount
  }

  return { totalKills: total, kills }
}
