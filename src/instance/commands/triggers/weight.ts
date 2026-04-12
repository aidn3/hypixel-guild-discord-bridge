/*
 * @author SkyCryptWebsite <https://github.com/SkyCryptWebsite>
 * @license MIT <https://github.com/SkyCryptWebsite/SkyCrypt/blob/e2f421dec3a8afdd4830a26d206ec439e933266f/LICENSE>
 * @see https://github.com/SkyCryptWebsite/SkyCrypt/blob/e2f421dec3a8afdd4830a26d206ec439e933266f/src/constants/weight/senither-weight.js
 */

import assert from 'node:assert'

import axios from 'axios'
import LilyWeight from 'lilyweight'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type {
  HypixelSkyblockSkill,
  HypixelSkyblockSkillsResponse,
  SkyblockMember
} from '../../../core/hypixel/hypixel-skyblock-types'
import {
  getDungeonLevelWithOverflow,
  getSelectedSkyblockProfile,
  getUuidIfExists,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

type SkillName =
  | 'mining'
  | 'foraging'
  | 'enchanting'
  | 'farming'
  | 'combat'
  | 'fishing'
  | 'alchemy'
  | 'taming'
  | 'carpentry'
  | 'runecrafting'
  | 'social'

type SkillExperienceKey =
  | 'SKILL_MINING'
  | 'SKILL_FORAGING'
  | 'SKILL_ENCHANTING'
  | 'SKILL_FARMING'
  | 'SKILL_COMBAT'
  | 'SKILL_FISHING'
  | 'SKILL_ALCHEMY'
  | 'SKILL_TAMING'
  | 'SKILL_CARPENTRY'
  | 'SKILL_RUNECRAFTING'
  | 'SKILL_SOCIAL'

type DungeonClassName = 'healer' | 'mage' | 'berserk' | 'archer' | 'tank'
type DungeonWeightName = 'catacombs' | DungeonClassName
type SlayerName = 'zombie' | 'spider' | 'wolf' | 'enderman'
type LilySkillName = 'enchanting' | 'taming' | 'alchemy' | 'mining' | 'farming' | 'foraging' | 'combat' | 'fishing'
type LilySlayerName = 'zombie' | 'spider' | 'wolf' | 'enderman' | 'blaze'
/* eslint-disable @typescript-eslint/naming-convention */
interface LilyCatacombsCompletions {
  '0': number
  '1': number
  '2': number
  '3': number
  '4': number
  '5': number
  '6': number
  '7': number
}
interface LilyMasterCatacombsCompletions {
  '1': number
  '2': number
  '3': number
  '4': number
  '5': number
  '6': number
  '7': number
}
/* eslint-enable @typescript-eslint/naming-convention */

const LilySkillOrder = [
  'enchanting',
  'taming',
  'alchemy',
  'mining',
  'farming',
  'foraging',
  'combat',
  'fishing'
] as const
const LilySlayerOrder = ['zombie', 'spider', 'wolf', 'enderman', 'blaze'] as const
const LilySkillXpPerLevel = [
  0, 50, 125, 200, 300, 500, 750, 1000, 1500, 2000, 3500, 5000, 7500, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000,
  100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000, 1_100_000, 1_200_000,
  1_300_000, 1_400_000, 1_500_000, 1_600_000, 1_700_000, 1_800_000, 1_900_000, 2_000_000, 2_100_000, 2_200_000,
  2_300_000, 2_400_000, 2_500_000, 2_600_000, 2_750_000, 2_900_000, 3_100_000, 3_400_000, 3_700_000, 4_000_000,
  4_300_000, 4_600_000, 4_900_000, 5_200_000, 5_500_000, 5_800_000, 6_100_000, 6_400_000, 6_700_000, 7_000_000
] as const

interface SkillGroup {
  exponent?: number
  divider?: number
  maxLevel: number
}

interface WeightResult {
  weight: number
  weightOverflow: number
}

interface WeightProfile {
  levels: Record<SkillName, { unlockableLevelWithProgress: number; xp: number }>
  dungeons: {
    catacombs?: { visited: boolean; level: { levelWithProgress: number; xp: number } }
    classes: Partial<Record<DungeonClassName, { experience: { levelWithProgress: number; xp: number } }>>
  }
  slayers: Record<SlayerName, { level: { xp: number } }>
}

interface SenitherWeight {
  overall: number
  dungeon: {
    total: number
    dungeons: Record<string, WeightResult>
    classes: Record<string, WeightResult>
  }
  skill: {
    total: number
    skills: Record<string, number>
  }
  slayer: {
    total: number
    slayers: Record<string, WeightResult>
  }
}

const Level50Xp = 55_172_425
const Level60Xp = 111_672_425

const SkillWeightMap: Record<SkillName, SkillGroup> = {
  mining: {
    exponent: 1.182_074_48,
    divider: 259_634,
    maxLevel: 60
  },
  foraging: {
    exponent: 1.232_826,
    divider: 259_634,
    maxLevel: 50
  },
  enchanting: {
    exponent: 0.969_765_83,
    divider: 882_758,
    maxLevel: 60
  },
  farming: {
    exponent: 1.217_848_139,
    divider: 220_689,
    maxLevel: 60
  },
  combat: {
    exponent: 1.157_976_872_65,
    divider: 275_862,
    maxLevel: 60
  },
  fishing: {
    exponent: 1.406_418,
    divider: 88_274,
    maxLevel: 50
  },
  alchemy: {
    exponent: 1,
    divider: 1_103_448,
    maxLevel: 50
  },
  taming: {
    exponent: 1.147_44,
    divider: 441_379,
    maxLevel: 50
  },
  carpentry: {
    maxLevel: 50
  },
  runecrafting: {
    maxLevel: 25
  },
  social: {
    maxLevel: 25
  }
}

const DungeonWeightMap: Record<DungeonWeightName, number> = {
  catacombs: 0.000_214_960_461_5,
  healer: 0.000_004_525_483_4,
  mage: 0.000_004_525_483_4,
  berserk: 0.000_004_525_483_4,
  archer: 0.000_004_525_483_4,
  tank: 0.000_004_525_483_4
}

const SlayerWeightMap: Record<SlayerName, { divider: number; modifier: number }> = {
  zombie: {
    divider: 2208,
    modifier: 0.15
  },
  spider: {
    divider: 2118,
    modifier: 0.08
  },
  wolf: {
    divider: 1962,
    modifier: 0.015
  },
  enderman: {
    divider: 1430,
    modifier: 0.017
  }
}

export default class Weight extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['weight', 'w'],
      description: "Returns a player's Senither, Lily, and farming weight",
      example: `w %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const possessiveUsername = givenUsername + (givenUsername.toLowerCase().endsWith('s') ? "'" : "'s")
    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (selectedProfile === undefined) return playerNeverPlayedSkyblock(context, givenUsername)

    const skillsResponse = await context.app.hypixelApi.getSkyblockSkills()
    const senitherWeight = calculateSenitherWeight(this.createWeightProfile(selectedProfile, skillsResponse))
    const farmingWeight = await this.getFarmingWeight(uuid)
    const lilyWeight = calculateLilyWeight(selectedProfile).total

    return context.app.i18n.t(($) => $['commands.weight.response'], {
      username: possessiveUsername,
      senitherWeight: senitherWeight.overall,
      farmingWeight,
      lilyWeight
    })
  }

  private createWeightProfile(profile: SkyblockMember, skillsResponse: HypixelSkyblockSkillsResponse): WeightProfile {
    const skills = skillsResponse.skills
    const experience = (profile.player_data.experience ?? {}) as Partial<Record<SkillExperienceKey, number>>
    const petTypesSacrificed = profile.pets_data?.pet_care?.pet_types_sacrificed ?? []
    const profileClasses = profile.dungeons?.player_classes as
      | Partial<Record<DungeonClassName, { experience?: number }>>
      | undefined
    const slayerBosses = (profile.slayer?.slayer_bosses ?? {}) as Partial<Record<SlayerName, { xp?: number }>>
    const catacombsExperience = profile.dungeons?.dungeon_types.catacombs.experience

    const levels: WeightProfile['levels'] = {
      mining: this.createSkillData(skills.MINING, experience.SKILL_MINING ?? 0),
      foraging: this.createSkillData(skills.FORAGING, experience.SKILL_FORAGING ?? 0),
      enchanting: this.createSkillData(skills.ENCHANTING, experience.SKILL_ENCHANTING ?? 0),
      farming: this.createSkillData(
        skills.FARMING,
        experience.SKILL_FARMING ?? 0,
        50 + (profile.jacobs_contest?.perks?.farming_level_cap ?? 0)
      ),
      combat: this.createSkillData(skills.COMBAT, experience.SKILL_COMBAT ?? 0),
      fishing: this.createSkillData(skills.FISHING, experience.SKILL_FISHING ?? 0),
      alchemy: this.createSkillData(skills.ALCHEMY, experience.SKILL_ALCHEMY ?? 0),
      taming: this.createSkillData(skills.TAMING, experience.SKILL_TAMING ?? 0, 50 + petTypesSacrificed.length),
      carpentry: this.createSkillData(skills.CARPENTRY, experience.SKILL_CARPENTRY ?? 0),
      runecrafting: this.createSkillData(skills.RUNECRAFTING, experience.SKILL_RUNECRAFTING ?? 0),
      social: this.createSkillData(skills.SOCIAL, experience.SKILL_SOCIAL ?? 0)
    }

    const classes: WeightProfile['dungeons']['classes'] = {}
    if (profileClasses?.healer?.experience !== undefined) {
      classes.healer = { experience: this.createDungeonData(profileClasses.healer.experience) }
    }
    if (profileClasses?.mage?.experience !== undefined) {
      classes.mage = { experience: this.createDungeonData(profileClasses.mage.experience) }
    }
    if (profileClasses?.berserk?.experience !== undefined) {
      classes.berserk = { experience: this.createDungeonData(profileClasses.berserk.experience) }
    }
    if (profileClasses?.archer?.experience !== undefined) {
      classes.archer = { experience: this.createDungeonData(profileClasses.archer.experience) }
    }
    if (profileClasses?.tank?.experience !== undefined) {
      classes.tank = { experience: this.createDungeonData(profileClasses.tank.experience) }
    }

    return {
      levels,
      dungeons: {
        catacombs:
          catacombsExperience === undefined
            ? undefined
            : {
                visited: true,
                level: this.createDungeonData(catacombsExperience)
              },
        classes
      },
      slayers: {
        zombie: { level: { xp: slayerBosses.zombie?.xp ?? 0 } },
        spider: { level: { xp: slayerBosses.spider?.xp ?? 0 } },
        wolf: { level: { xp: slayerBosses.wolf?.xp ?? 0 } },
        enderman: { level: { xp: slayerBosses.enderman?.xp ?? 0 } }
      }
    }
  }

  private createSkillData(
    skill: HypixelSkyblockSkill,
    xp: number,
    cap?: number
  ): { unlockableLevelWithProgress: number; xp: number } {
    return {
      unlockableLevelWithProgress: this.getSkillLevel(skill, xp, cap),
      xp
    }
  }

  private createDungeonData(xp: number): { levelWithProgress: number; xp: number } {
    return {
      levelWithProgress: Math.min(getDungeonLevelWithOverflow(xp), 50),
      xp
    }
  }

  private getSkillLevel(skill: HypixelSkyblockSkill, experience: number, cap?: number): number {
    const xpTable = skill.levels.map((level, index, levels) =>
      index === 0 ? level.totalExpRequired : level.totalExpRequired - levels[index - 1].totalExpRequired
    )
    const levelCap = cap ?? xpTable.length

    let uncappedLevel = 0
    let xpCurrent = experience
    let xpRemaining = experience

    while (uncappedLevel < xpTable.length && xpTable[uncappedLevel] <= xpRemaining) {
      xpRemaining -= xpTable[uncappedLevel]
      uncappedLevel++

      if (uncappedLevel <= levelCap) {
        xpCurrent = xpRemaining
      }
    }

    xpCurrent = Math.floor(xpCurrent)

    const level = Math.min(levelCap, uncappedLevel)
    const maxLevel = levelCap
    const xpForNext = level < maxLevel ? Math.ceil(xpTable[level] ?? Infinity) : Infinity
    const progress = level >= maxLevel ? 0 : Math.max(0, Math.min(xpCurrent / xpForNext, 1))
    const levelWithProgress = level + progress

    return cap === undefined ? levelWithProgress : Math.min(uncappedLevel + progress, maxLevel)
  }

  private async getFarmingWeight(playerUuid: string): Promise<number> {
    const EliteSkyblockApiPath = 'https://api.eliteskyblock.com'
    const FarmingWeightPath = '/weight'

    const result = await axios
      .get<FarmingWeightResponse>(`${FarmingWeightPath}/${playerUuid}/selected`, { baseURL: EliteSkyblockApiPath })
      .catch(() => undefined)

    if (result === undefined) return 0

    assert.ok(result.status === 200)
    return typeof result.data.totalWeight === 'number' ? result.data.totalWeight : 0
  }
}

function calculateLilyWeight(profile: SkyblockMember) {
  const experience = (profile.player_data.experience ?? {}) as Partial<Record<SkillExperienceKey, number>>
  const skillLevels = LilySkillOrder.map((skillName) => sanitizeFiniteNumber(getLilySkillLevel(skillName, experience)))
  const skillXp = LilySkillOrder.map((skillName) => sanitizeFiniteNumber(getLilySkillXp(skillName, experience)))

  const catacombs = profile.dungeons?.dungeon_types.catacombs
  const masterCatacombs = profile.dungeons?.dungeon_types.master_catacombs
  const cataCompletions = mapCatacombsCompletions(catacombs?.tier_completions)
  const masterCataCompletions = mapMasterCatacombsCompletions(masterCatacombs?.tier_completions)
  const cataXp = sanitizeFiniteNumber(catacombs === undefined ? 0 : catacombs.experience)

  const slayerBosses = (profile.slayer?.slayer_bosses ?? {}) as Partial<Record<LilySlayerName, { xp?: number }>>
  const slayerXp = LilySlayerOrder.map((slayerName) => sanitizeFiniteNumber(slayerBosses[slayerName]?.xp ?? 0))

  const lilyWeight = LilyWeight.getWeightRaw(
    skillLevels,
    skillXp,
    cataCompletions,
    masterCataCompletions,
    cataXp,
    slayerXp
  )
  return Number.isFinite(lilyWeight.total)
    ? lilyWeight
    : {
        total: 0,
        skill: { base: 0, overflow: 0 },
        catacombs: { completion: { base: 0, master: 0 }, experience: 0 },
        slayer: 0
      }
}

function getLilySkillLevel(skillName: LilySkillName, experience: Partial<Record<SkillExperienceKey, number>>): number {
  const skillMap = {
    enchanting: experience.SKILL_ENCHANTING ?? 0,
    taming: experience.SKILL_TAMING ?? 0,
    alchemy: experience.SKILL_ALCHEMY ?? 0,
    mining: experience.SKILL_MINING ?? 0,
    farming: experience.SKILL_FARMING ?? 0,
    foraging: experience.SKILL_FORAGING ?? 0,
    combat: experience.SKILL_COMBAT ?? 0,
    fishing: experience.SKILL_FISHING ?? 0
  } satisfies Record<LilySkillName, number>

  return getLilyLevelFromXp(skillMap[skillName])
}

function getLilySkillXp(skillName: LilySkillName, experience: Partial<Record<SkillExperienceKey, number>>): number {
  const skillXpMap = {
    enchanting: experience.SKILL_ENCHANTING ?? 0,
    taming: experience.SKILL_TAMING ?? 0,
    alchemy: experience.SKILL_ALCHEMY ?? 0,
    mining: experience.SKILL_MINING ?? 0,
    farming: experience.SKILL_FARMING ?? 0,
    foraging: experience.SKILL_FORAGING ?? 0,
    combat: experience.SKILL_COMBAT ?? 0,
    fishing: experience.SKILL_FISHING ?? 0
  } satisfies Record<LilySkillName, number>

  return skillXpMap[skillName]
}

function mapCatacombsCompletions(
  tierCompletions: Record<string, number | undefined> | undefined
): LilyCatacombsCompletions {
  /* eslint-disable @typescript-eslint/naming-convention */
  const completions: LilyCatacombsCompletions = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 }
  /* eslint-enable @typescript-eslint/naming-convention */
  if (tierCompletions === undefined) return completions

  for (const key of Object.keys(completions) as (keyof LilyCatacombsCompletions)[]) {
    completions[key] = sanitizeFiniteNumber(tierCompletions[key] ?? 0)
  }

  return completions
}

function mapMasterCatacombsCompletions(
  tierCompletions: Record<string, number | undefined> | undefined
): LilyMasterCatacombsCompletions {
  /* eslint-disable @typescript-eslint/naming-convention */
  const completions: LilyMasterCatacombsCompletions = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 }
  /* eslint-enable @typescript-eslint/naming-convention */
  if (tierCompletions === undefined) return completions

  for (const key of Object.keys(completions) as (keyof LilyMasterCatacombsCompletions)[]) {
    completions[key] = sanitizeFiniteNumber(tierCompletions[key] ?? 0)
  }

  return completions
}

function getLilyLevelFromXp(xp: number): number {
  let xpAdded = 0
  for (const [index, element] of LilySkillXpPerLevel.entries()) {
    xpAdded += element
    if (xp < xpAdded) {
      return Math.floor(index - 1 + (xp - (xpAdded - element)) / element)
    }
  }

  return 60
}

function sanitizeFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

function calcSkillWeight(skillGroup: SkillGroup, level: number | undefined, experience: number): WeightResult {
  if (skillGroup.exponent === undefined || skillGroup.divider === undefined || level === undefined) {
    return {
      weight: 0,
      weightOverflow: 0
    }
  }

  const cappedLevel = Math.min(level, skillGroup.maxLevel)
  const maxSkillLevelXp = skillGroup.maxLevel === 60 ? Level60Xp : Level50Xp

  let base = Math.pow(cappedLevel * 10, 0.5 + skillGroup.exponent + cappedLevel / 100) / 1250
  if (experience > maxSkillLevelXp) {
    base = Math.round(base)
  }

  if (experience <= maxSkillLevelXp) {
    return {
      weight: base,
      weightOverflow: 0
    }
  }

  return {
    weight: base,
    weightOverflow: Math.pow((experience - maxSkillLevelXp) / skillGroup.divider, 0.968)
  }
}

function calcDungeonsWeight(type: DungeonWeightName, level: number, experience: number): WeightResult {
  const percentageModifier = DungeonWeightMap[type]
  const level50Experience = 569_809_640
  const base = Math.pow(level, 4.5) * percentageModifier

  if (experience <= level50Experience) {
    return {
      weight: base,
      weightOverflow: 0
    }
  }

  const remaining = experience - level50Experience
  const splitter = (4 * level50Experience) / base

  return {
    weight: Math.floor(base),
    weightOverflow: Math.pow(remaining / splitter, 0.968)
  }
}

function calcSlayerWeight(type: SlayerName, experience: number): WeightResult {
  const slayer = SlayerWeightMap[type]

  if (experience <= 1_000_000) {
    return {
      weight: experience / slayer.divider,
      weightOverflow: 0
    }
  }

  const base = 1_000_000 / slayer.divider
  let remaining = experience - 1_000_000
  let modifier = slayer.modifier
  let overflow = 0

  while (remaining > 0) {
    const left = Math.min(remaining, 1_000_000)
    overflow += Math.pow(left / (slayer.divider * (1.5 + modifier)), 0.942)
    modifier += slayer.modifier
    remaining -= left
  }

  return {
    weight: base,
    weightOverflow: overflow
  }
}

function calculateSenitherWeight(profile: WeightProfile): SenitherWeight {
  const output: SenitherWeight = {
    overall: 0,
    dungeon: {
      total: 0,
      dungeons: {},
      classes: {}
    },
    skill: {
      total: 0,
      skills: {}
    },
    slayer: {
      total: 0,
      slayers: {}
    }
  }

  for (const skillName of Object.keys(profile.levels) as SkillName[]) {
    const data = profile.levels[skillName]
    const weight = calcSkillWeight(SkillWeightMap[skillName], data.unlockableLevelWithProgress, data.xp)

    output.skill.skills[skillName] = weight.weight + weight.weightOverflow
    output.skill.total += output.skill.skills[skillName]
  }

  if (profile.dungeons.catacombs?.visited) {
    const catacombs = profile.dungeons.catacombs.level
    const catacombsWeight = calcDungeonsWeight('catacombs', Math.min(catacombs.levelWithProgress, 50), catacombs.xp)

    output.dungeon.total += catacombsWeight.weight + catacombsWeight.weightOverflow
    output.dungeon.dungeons.catacombs = catacombsWeight
  }

  for (const className of Object.keys(profile.dungeons.classes) as DungeonClassName[]) {
    const dungeonClass = profile.dungeons.classes[className]
    if (dungeonClass === undefined) continue

    const weight = calcDungeonsWeight(className, dungeonClass.experience.levelWithProgress, dungeonClass.experience.xp)
    output.dungeon.total += weight.weight + weight.weightOverflow
    output.dungeon.classes[className] = weight
  }

  for (const slayerName of Object.keys(profile.slayers) as SlayerName[]) {
    const slayer = profile.slayers[slayerName]
    const weight = calcSlayerWeight(slayerName, slayer.level.xp)

    output.slayer.slayers[slayerName] = weight
    output.slayer.total += weight.weight + weight.weightOverflow
  }

  output.overall = [output.dungeon.total, output.skill.total, output.slayer.total]
    .filter((value) => value >= 0)
    .reduce((total, value) => total + value, 0)

  return output
}

export interface FarmingWeightResponse {
  totalWeight: number
}
