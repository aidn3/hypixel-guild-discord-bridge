import { ProfileNetworthCalculator } from 'skyhelper-networth'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber } from '../../../common/helper-functions.js'
import { getLevelByXp, getSkillAverage } from '../common/skills'
import {
  getSelectedSkyblockProfileData,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
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

const HotmXpTable = [0, 0, 3000, 9000, 25_000, 60_000, 100_000, 150_000, 210_000, 290_000, 400_000]

export default class Skyblock extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['skyblock', 'sb', 'stats'],
      description: "Returns a player's skyblock stats",
      example: `skyblock %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selected = await getSelectedSkyblockProfileData(context.app.hypixelApi, uuid)
    if (!selected) return playerNeverPlayedSkyblock(context, givenUsername)

    const skyblockExperience = selected.member.leveling?.experience ?? 0
    const skyblockLevel = skyblockExperience > 0 ? skyblockExperience / 100 : 0

    const skillAverage = getSkillAverage(selected.member)
    const slayerBosses = selected.member.slayer?.slayer_bosses
    const slayerSummary = slayerBosses ? formatSlayerSummary(slayerBosses) : 'None'

    const dungeons = selected.member.dungeons
    const catacombsExperience = dungeons?.dungeon_types?.catacombs?.experience ?? 0
    const catacombsLevel = getLevelByXp(catacombsExperience, { type: 'dungeoneering' }).levelWithProgress
    const classAverage = dungeons?.player_classes ? formatClassAverage(dungeons.player_classes) : 0

    const magicalPower = selected.member.accessory_bag_storage?.highest_magical_power ?? 0
    const hotmExperience = selected.member.mining_core?.experience ?? 0
    const hotmLevel = getHotmLevel(hotmExperience)

    const bankBalance = selected.profile.banking?.balance ?? 0
    const museum = await context.app.hypixelApi
      .getSkyblockMuseum(uuid, selected.profile.profile_id, { raw: true })
      .catch(() => undefined)
    const museumMember = museum?.members?.[uuid]

    let networth = 'N/A'
    const networthManager = new ProfileNetworthCalculator(selected.member, museumMember, bankBalance)
    const networthData = await networthManager.getNetworth({ onlyNetworth: true }).catch(() => undefined)
    if (networthData && !networthData.noInventory) {
      networth = formatNumber(networthData.networth)
    }

    return (
      `${givenUsername}'s Level: ${formatNumber(skyblockLevel, 2)} | ` +
      `Skill Avg: ${skillAverage} | ` +
      `Slayer: ${slayerSummary} | ` +
      `Cata: ${formatNumber(catacombsLevel, 2)} | ` +
      `Class Avg: ${formatNumber(classAverage, 2)} | ` +
      `NW: ${networth} | ` +
      `MP: ${formatNumber(magicalPower, 0)} | ` +
      `Hotm: ${formatNumber(hotmLevel, 2)}`
    )
  }
}

function formatSlayerSummary(slayerBosses: Record<string, { xp?: number }>): string {
  const entries = SlayerTypes.map((type) => {
    const xp = slayerBosses[type]?.xp ?? 0
    const level = getSlayerLevel(type, xp)
    return `${level}${type[0].toUpperCase()}`
  })

  return entries.join(', ')
}

function getSlayerLevel(type: SlayerType, xp: number): number {
  const table = SlayerXpTable[type]
  let level = 0

  for (const [index, element] of table.entries()) {
    if (xp >= element) level = index + 1
  }

  return level
}

function formatClassAverage(classes: Record<string, { experience?: number }>): number {
  const classNames = ['healer', 'mage', 'berserk', 'archer', 'tank']
  let total = 0
  let count = 0

  for (const name of classNames) {
    const experience = classes[name]?.experience ?? 0
    const level = getLevelByXp(experience, { type: 'dungeoneering' }).levelWithProgress
    total += level
    count += 1
  }

  return count > 0 ? total / count : 0
}

function getHotmLevel(experience: number): number {
  let level = 0
  let xpRemaining = experience
  let xpCurrent = experience

  while (HotmXpTable[level + 1] !== undefined && HotmXpTable[level + 1] <= xpRemaining) {
    level += 1
    xpRemaining -= HotmXpTable[level]
    xpCurrent = xpRemaining
  }

  const maxLevel = HotmXpTable.length - 1
  if (level >= maxLevel) return maxLevel

  const xpForNext = HotmXpTable[level + 1]
  const progress = xpForNext > 0 ? Math.max(0, Math.min(xpCurrent / xpForNext, 1)) : 0
  return Math.min(level + progress, maxLevel)
}
