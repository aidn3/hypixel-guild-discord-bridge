import assert from 'node:assert'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import type { SkyblockMember } from '../../../core/hypixel/hypixel-skyblock'
import { getDungeonLevelWithOverflow } from '../../../core/hypixel/hypixel-skyblock'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  parseEncodedNbt,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

const FloorsBaseExp = {
  m7: 221_500, // calculated based on real world ~420k xp per run with all boosts applied
  m6: 66_666,
  m5: 46_666,
  m4: 36_666,
  m3: 23_333,
  m2: 13_333,
  m1: 10_000
}

type ClassName = 'healer' | 'berserk' | 'mage' | 'archer' | 'tank'

/* eslint-disable @typescript-eslint/naming-convention */
interface InventoryItem {
  id?: number
  Count?: number
  tag?: ItemData
}

/* eslint-disable @typescript-eslint/naming-convention */

interface ItemData {
  display?: { Name?: string; Lore?: string[] }
  ExtraAttributes?: { id: string; enchantments?: Record<string, number> }
}

export default class RunsToClassAverage extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['rtca'],
      description: 'Returns the number of runs needed to reach the average class level specified',
      example: `rtca Steve m7 50`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const selectedFloor = context.args[1]?.toLowerCase() ?? 'm7'
    const targetAverage = Number.isFinite(+context.args[2]) ? +context.args[2] : 50

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    if (!(selectedFloor in FloorsBaseExp)) return `Invalid floor selected: ${selectedFloor}`
    const xpPerRun = FloorsBaseExp[selectedFloor as keyof typeof FloorsBaseExp]

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (selectedProfile.dungeons?.player_classes === undefined) {
      return playerNeverPlayedDungeons(givenUsername)
    }

    const scarfShardsBoost = this.getScarfShardBoot(selectedProfile)
    const scarfAccessoryBoost = await this.getScarfAccessoryBoost(selectedProfile)
    const hecatombBoost = await this.getHecatacombBoost(selectedProfile)
    const classBoosts = this.getClassBoosts(selectedProfile)
    const profileBoosts = scarfShardsBoost + scarfAccessoryBoost + hecatombBoost
    const globalBoost = await this.getGlobalBoost(context)

    const classExpBoosts = {
      healer: 1 + classBoosts.healer + profileBoosts + globalBoost,
      berserk: 1 + classBoosts.berserk + profileBoosts + globalBoost,
      mage: 1 + classBoosts.mage + profileBoosts + globalBoost,
      archer: 1 + classBoosts.archer + profileBoosts + globalBoost,
      tank: 1 + classBoosts.tank + profileBoosts + globalBoost
    } satisfies Record<ClassName, number>

    let totalRuns = 0
    const runsDone = { healer: 0, berserk: 0, mage: 0, archer: 0, tank: 0 } as Record<ClassName, number>
    const classesExperiences = { healer: 0, berserk: 0, mage: 0, archer: 0, tank: 0 } as Record<ClassName, number>

    for (const [className, classObject] of Object.entries(selectedProfile.dungeons.player_classes)) {
      classesExperiences[className as ClassName] = classObject?.experience ?? 0
    }

    let currentClassAverage = this.getClassAverage(classesExperiences, targetAverage)
    const classes = Object.keys(runsDone) as ClassName[]

    while (currentClassAverage < targetAverage) {
      const floorBoost = this.getFloorBoost(selectedProfile, selectedFloor as keyof typeof FloorsBaseExp, totalRuns)

      let currentClassPlaying: undefined | ClassName = undefined
      for (const key of classes) {
        classesExperiences[key] += xpPerRun * 0.25 * (classExpBoosts[key] + floorBoost)
        if (currentClassPlaying === undefined || classesExperiences[key] < classesExperiences[currentClassPlaying]) {
          currentClassPlaying = key
        }
      }

      assert.ok(currentClassPlaying)
      classesExperiences[currentClassPlaying] += xpPerRun * 0.75 * (classExpBoosts[currentClassPlaying] + floorBoost)
      runsDone[currentClassPlaying]++

      currentClassAverage = this.getClassAverage(classesExperiences, targetAverage)
      totalRuns++

      if (totalRuns > 15_000) {
        return `${givenUsername} needs more than 15,000 runs to reach the average class level of ${targetAverage}.`
      }
    }

    if (totalRuns === 0) {
      return `${givenUsername} has reached c.a. ${targetAverage} already!`
    }

    return `${givenUsername} is ${totalRuns} ${selectedFloor.toUpperCase()} away from c.a. ${targetAverage} (${classes
      .filter((c) => runsDone[c] > 0)
      .map((c) => `${c} ${runsDone[c]}`)
      .join(' - ')})`
  }

  private getClassAverage(classData: Record<string, number>, targetAverage: number): number {
    const classesXp = Object.values(classData)
    return (
      classesXp
        .map((xp) => getDungeonLevelWithOverflow(xp))
        .map((level) => Math.min(level, targetAverage))
        .reduce((a, b) => a + b, 0) / classesXp.length
    )
  }

  private async getGlobalBoost(context: ChatCommandContext): Promise<number> {
    let totalBoost = 0

    const government = await context.app.hypixelApi.getSkyblockElection()
    if (government.mayor.key === 'aura') {
      totalBoost += 0.5
    } else if (government.mayor.key === 'derpy') {
      totalBoost += 0.5
    }

    return totalBoost
  }

  private getScarfShardBoot(profile: SkyblockMember): number {
    const scarfShards = profile.attributes?.stacks.catacombs_graduate ?? 0

    if (scarfShards >= 24) return 0.2
    else if (scarfShards >= 19) return 0.18
    else if (scarfShards >= 15) return 0.16
    else if (scarfShards >= 12) return 0.14
    else if (scarfShards >= 9) return 0.12
    else if (scarfShards >= 7) return 0.1
    else if (scarfShards >= 5) return 0.08
    else if (scarfShards >= 3) return 0.06
    else if (scarfShards >= 2) return 0.04
    else if (scarfShards >= 1) return 0.02
    else return 0
  }

  private async getScarfAccessoryBoost(profile: SkyblockMember): Promise<number> {
    const Accessories = { SCARF_GRIMOIRE: 0.06, SCARF_THESIS: 0.04, SCARF_STUDIES: 0.02 }
    let scarfAccessoryBoost = 0

    const accessoriesRaw = profile.inventory?.bag_contents?.talisman_bag?.data
    if (accessoriesRaw !== undefined) {
      const accessories = await parseEncodedNbt<{ i: InventoryItem[] }>(accessoriesRaw)

      for (const item of accessories.i) {
        const itemId = item.tag?.ExtraAttributes?.id
        if (typeof itemId === 'string' && Object.keys(Accessories).includes(itemId)) {
          const itemBoost = Accessories[itemId as keyof typeof Accessories]
          if (itemBoost > scarfAccessoryBoost) scarfAccessoryBoost = itemBoost
        }
      }
    }

    const inventoryRaw = profile.inventory?.inv_contents?.data
    if (inventoryRaw !== undefined) {
      const inventory = await parseEncodedNbt<{ i: InventoryItem[] }>(inventoryRaw)

      for (const item of inventory.i) {
        const itemId = item.tag?.ExtraAttributes?.id
        if (typeof itemId === 'string' && Object.keys(Accessories).includes(itemId)) {
          const itemBoost = Accessories[itemId as keyof typeof Accessories]
          if (itemBoost > scarfAccessoryBoost) scarfAccessoryBoost = itemBoost
        }
      }
    }

    return scarfAccessoryBoost
  }

  private getClassBoosts(profile: SkyblockMember): Record<ClassName, number> {
    return {
      healer: (profile.player_data.perks?.heart_of_gold ?? 0) * 0.02,
      berserk: (profile.player_data.perks?.unbridled_rage ?? 0) * 0.02,
      mage: (profile.player_data.perks?.coldEfficiency ?? 0) * 0.02,
      archer: (profile.player_data.perks?.toxophilite ?? 0) * 0.02,
      tank: (profile.player_data.perks?.diamond_in_the_rough ?? 0) * 0.02
    }
  }

  /**
   * Completing the same floor multiple times
   *   └ You gain bonus 2% * (total floor completions -1)
   *     └ F1-F5 | 150% max XP buff | 76 max run cap
   *     └ F6    | 100% max XP buff | 51 max run cap
   *     └ F7/M7 | 50% max XP buff  | 26 max run cap
   *
   * @private
   * @see https://web.archive.org/web/20260305134813/https://wiki.hypixel.net/Dungeoneering#Maximizing_XP_Gains
   * @see https://wiki.hypixel.net/Dungeoneering#Maximizing_XP_Gains
   */
  private getFloorBoost(profile: SkyblockMember, floor: keyof typeof FloorsBaseExp, currentRuns: number): number {
    const FloorBoost = 0.02
    if (floor === 'm7') {
      const runs = profile.dungeons?.dungeon_types.master_catacombs?.tier_completions?.[7] ?? 0
      const totalRuns = runs + currentRuns
      if (totalRuns === 0) return 0
      return FloorBoost * (Math.min(totalRuns, 26) - 1)
    }

    return 0
  }

  private async getHecatacombBoost(profile: SkyblockMember): Promise<number> {
    const HecatombEnchantment = {
      1: 0.0056,
      2: 0.0072,
      3: 0.0088,
      4: 0.0104,
      5: 0.012,
      6: 0.0136,
      7: 0.0152,
      8: 0.0168,
      9: 0.0184,
      10: 0.02
    }

    const allItems: InventoryItem[] = []
    const armorRaw = profile.inventory?.inv_armor?.data
    if (armorRaw !== undefined) {
      const items = await parseEncodedNbt<{ i: InventoryItem[] }>(armorRaw)
      allItems.push(...items.i)
    }
    const inventoryRaw = profile.inventory?.inv_contents?.data
    if (inventoryRaw !== undefined) {
      const items = await parseEncodedNbt<{ i: InventoryItem[] }>(inventoryRaw)
      allItems.push(...items.i)
    }
    const enderRaw = profile.inventory?.ender_chest_contents?.data
    if (enderRaw !== undefined) {
      const items = await parseEncodedNbt<{ i: InventoryItem[] }>(enderRaw)
      allItems.push(...items.i)
    }
    const backpacks = profile.inventory?.backpack_contents
    if (backpacks) {
      for (const backpack of Object.values(backpacks)) {
        const items = await parseEncodedNbt<{ i: InventoryItem[] }>(backpack.data)
        allItems.push(...items.i)
      }
    }
    const armorLoadouts = profile.loadout?.armor
    if (armorLoadouts) {
      for (const loadout of Object.values(armorLoadouts)) {
        if (typeof loadout === 'number') continue
        if (loadout.HELMET?.data === undefined) continue
        const items = await parseEncodedNbt<{ i: InventoryItem[] }>(loadout.HELMET.data)
        allItems.push(...items.i)
      }
    }

    let highestBoost = 0
    for (const item of allItems) {
      const enchantments = item.tag?.ExtraAttributes?.enchantments
      if (enchantments) {
        const hecatomb = enchantments.hecatomb as number | undefined
        if (hecatomb === undefined || !(hecatomb in HecatombEnchantment)) continue
        const itemBoost = HecatombEnchantment[hecatomb as keyof typeof HecatombEnchantment]
        if (itemBoost > highestBoost) highestBoost = itemBoost
      }
    }

    return highestBoost * 2 // the calculation assumes S+ score which doubles this value
  }
}
