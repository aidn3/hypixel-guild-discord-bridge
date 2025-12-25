import type { SkyblockV2Member, SkyblockV2Profile } from 'hypixel-api-reborn'

export const SkillOrder = [
  'combat',
  'farming',
  'fishing',
  'mining',
  'foraging',
  'enchanting',
  'alchemy',
  'carpentry',
  'runecrafting',
  'social',
  'taming'
] as const

type SkillName = (typeof SkillOrder)[number]

const CosmeticSkills = new Set<SkillName>(['runecrafting', 'social'])

const DefaultSkillCaps: Record<string, number> = {
  farming: 50,
  mining: 60,
  combat: 60,
  foraging: 50,
  fishing: 50,
  enchanting: 60,
  alchemy: 50,
  taming: 50,
  carpentry: 50,
  runecrafting: 25,
  social: 25,
  dungeoneering: 50
}

const MaxedSkillCaps: Record<string, number> = {
  farming: 60,
  taming: 60
}

const InfiniteLeveling = new Set(['dungeoneering', 'skyblockLevel'])

const DefaultSkillXpTable = [
  0, 50, 125, 200, 300, 500, 750, 1000, 1500, 2000, 3500, 5000, 7500, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000,
  100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000, 1_100_000, 1_200_000,
  1_300_000, 1_400_000, 1_500_000, 1_600_000, 1_700_000, 1_800_000, 1_900_000, 2_000_000, 2_100_000, 2_200_000,
  2_300_000, 2_400_000, 2_500_000, 2_600_000, 2_750_000, 2_900_000, 3_100_000, 3_400_000, 3_700_000, 4_000_000,
  4_300_000, 4_600_000, 4_900_000, 5_200_000, 5_500_000, 5_800_000, 6_100_000, 6_400_000, 6_700_000, 7_000_000
]

const RunecraftingXpTable = [
  0, 50, 100, 125, 160, 200, 250, 315, 400, 500, 625, 785, 1000, 1250, 1600, 2000, 2465, 3125, 4000, 5000, 6200, 7800,
  9800, 12_200, 15_300, 19_050
]

const SocialXpTable = [
  0, 50, 100, 150, 250, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 3750, 4500, 6000, 8000, 10_000, 12_500, 15_000,
  20_000, 25_000, 30_000, 35_000, 40_000, 50_000
]

function getXpTable(type = 'default'): number[] {
  if (type === 'runecrafting') return RunecraftingXpTable
  if (type === 'social') return SocialXpTable
  return DefaultSkillXpTable
}

export interface SkillLevel {
  xp: number
  level: number
  maxLevel: number
  xpCurrent: number
  xpForNext: number
  progress: number
  levelCap: number
  uncappedLevel: number
  levelWithProgress: number
  unlockableLevelWithProgress: number
  maxExperience: number
}

export type Skills = Record<SkillName, SkillLevel>

export function getSkillLevelCaps(profile: SkyblockV2Member): Partial<Record<SkillName, number>> {
  return {
    farming: 50 + (profile.jacobs_contest?.perks?.farming_level_cap ?? 0),
    taming: 50 + (profile.pets_data?.pet_care?.pet_types_sacrificed?.length ?? 0),
    runecrafting: 25
  }
}

export function getLevelByXp(xp: number, extra: { type?: string; cap?: number } = {}): SkillLevel {
  const xpTable = getXpTable(extra.type)
  const safeXp = Number.isFinite(xp) ? xp : 0
  const levelCap = extra.cap ?? DefaultSkillCaps[extra.type ?? ''] ?? xpTable.length - 1

  let uncappedLevel = 0
  let xpCurrent = safeXp
  let xpRemaining = safeXp

  while (xpTable[uncappedLevel + 1] !== undefined && xpTable[uncappedLevel + 1] <= xpRemaining) {
    uncappedLevel++
    xpRemaining -= xpTable[uncappedLevel]
    if (uncappedLevel <= levelCap) xpCurrent = xpRemaining
  }

  const isInfiniteLevelable = InfiniteLeveling.has(extra.type ?? '')
  if (isInfiniteLevelable) {
    const maxExperience = xpTable.at(-1) ?? 0
    if (maxExperience > 0) {
      uncappedLevel += Math.floor(xpRemaining / maxExperience)
      xpRemaining %= maxExperience
      xpCurrent = xpRemaining
    }
  }

  const maxLevel = isInfiniteLevelable
    ? Math.max(uncappedLevel, levelCap)
    : (MaxedSkillCaps[extra.type ?? ''] ?? levelCap)
  const level = isInfiniteLevelable ? uncappedLevel : Math.min(levelCap, uncappedLevel)
  const fallbackXp = xpTable.at(-1) ?? Infinity
  const xpForNext =
    level < maxLevel ? Math.ceil(xpTable[level + 1] ?? fallbackXp) : isInfiniteLevelable ? fallbackXp : Infinity
  const progress = level >= maxLevel && !isInfiniteLevelable ? 0 : Math.max(0, Math.min(xpCurrent / xpForNext, 1))
  const levelWithProgress = isInfiniteLevelable
    ? uncappedLevel + progress
    : Math.min(uncappedLevel + progress, levelCap)
  const unlockableLevelWithProgress = extra.cap ? Math.min(uncappedLevel + progress, maxLevel) : levelWithProgress
  const maxExperience = getSkillExperience(extra.type, levelCap)

  return {
    xp: safeXp,
    level,
    maxLevel,
    xpCurrent,
    xpForNext,
    progress,
    levelCap,
    uncappedLevel,
    levelWithProgress,
    unlockableLevelWithProgress,
    maxExperience
  }
}

export function getSkillAverage(
  profile: SkyblockV2Member,
  options: { decimals?: number; progress?: boolean; cosmetic?: boolean } = {}
): string {
  const skillLevelCaps = getSkillLevelCaps(profile)
  const decimals = options.decimals ?? 2
  const includeProgress = options.progress ?? false
  const includeCosmetic = options.cosmetic ?? false

  let totalLevel = 0
  let countedSkills = 0

  for (const skillId of SkillOrder) {
    if (!includeCosmetic && CosmeticSkills.has(skillId)) continue

    const xpKey = `SKILL_${skillId.toUpperCase()}`
    const xp = profile.player_data.experience?.[xpKey] ?? 0
    const levelData = getLevelByXp(xp, { type: skillId, cap: skillLevelCaps[skillId] })

    totalLevel += includeProgress ? levelData.levelWithProgress : levelData.level
    countedSkills += 1
  }

  const average = countedSkills > 0 ? totalLevel / countedSkills : 0
  return average.toFixed(decimals)
}

export function getSkills(profile: SkyblockV2Member, profileData: SkyblockV2Profile): Skills | null {
  const experience = profile.player_data.experience
  if (experience === undefined) return null

  const skillLevelCaps = getSkillLevelCaps(profile)
  const totalSocialXp = getSocialSkillExperience(profileData)

  const skills: Partial<Skills> = {}
  for (const skillId of SkillOrder) {
    const xpKey = `SKILL_${skillId.toUpperCase()}`
    const xp = skillId === 'social' ? totalSocialXp : (experience[xpKey] ?? 0)
    skills[skillId] = getLevelByXp(xp, { type: skillId, cap: skillLevelCaps[skillId] })
  }

  return skills as Skills
}

function getSkillExperience(type: string | undefined, level: number): number {
  const xpTable = getXpTable(type)
  let total = 0
  for (let index = 1; index <= level && index < xpTable.length; index++) {
    total += xpTable[index]
  }
  return total
}

function getSocialSkillExperience(profile: SkyblockV2Profile): number {
  return Object.values(profile.members).reduce((accumulator, member) => {
    return accumulator + (member.player_data.experience?.SKILL_SOCIAL ?? 0)
  }, 0)
}
