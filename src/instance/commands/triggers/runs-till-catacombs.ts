import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import type { SkyblockMember } from '../../../core/hypixel/hypixel-skyblock'
import {
  getSelectedSkyblockProfile,
  getUuidIfExists,
  parseEncodedNbt,
  playerNeverPlayedDungeons,
  playerNeverPlayedSkyblock,
  usernameNotExists
} from '../common/utility'

const FloorsBaseExp = {
  m7: 150_000,
  m6: 75_000,
  m5: 52_500,
  m4: 41_250,
  m3: 26_250,
  m2: 15_000,
  m1: 11_250
}

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

export default class RunsTillCatacombs extends ChatCommandHandler {
  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'rtc',
      triggers: ['rtc'],
      description: 'Returns the number of runs needed to reach the catacombs level specified',
      example: `rtc Steve m7 50`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const selectedFloor = context.args[1]?.toLowerCase() ?? 'm7'
    const targetLevel = Number.isFinite(+context.args[2]) ? +context.args[2] : 50

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    if (!(selectedFloor in FloorsBaseExp)) return `Invalid floor selected: ${selectedFloor}`

    const selectedProfile = await getSelectedSkyblockProfile(context.app.hypixelApi, uuid)
    if (!selectedProfile) return playerNeverPlayedSkyblock(context, givenUsername)

    if (selectedProfile.dungeons?.player_classes === undefined) {
      return playerNeverPlayedDungeons(givenUsername)
    }

    const currentXP = selectedProfile.dungeons.dungeon_types.catacombs.experience

    // XP required for each catacombs level
    const catacombsLevelXP = [
      50, 75, 110, 160, 230, 330, 470, 670, 950, 1340, 1890, 2665, 3760, 5260, 7380, 10_300, 14_400, 20_000, 27_600,
      38_000, 52_500, 71_500, 97_000, 132_000, 180_000, 243_000, 328_000, 445_000, 600_000, 800_000, 1_065_000,
      1_410_000, 1_900_000, 2_500_000, 3_300_000, 4_300_000, 5_600_000, 7_200_000, 9_200_000, 12_000_000, 15_000_000,
      19_000_000, 24_000_000, 30_000_000, 38_000_000, 48_000_000, 60_000_000, 75_000_000, 93_000_000, 116_250_000
    ]
    const targetXP =
      targetLevel <= 50
        ? catacombsLevelXP.slice(0, targetLevel).reduce((total, xp) => total + xp, 0)
        : 569_809_640 + (targetLevel - 50) * 200_000_000

    if (targetXP <= currentXP) {
      return `${givenUsername} has reached catacombs ${targetLevel} already!`
    }

    const bonzoShardsBoost = this.getBonzoShardBoost(selectedProfile)
    const expertRingBoost = await this.getExpertRingBoost(selectedProfile)
    const hecatombBoost = await this.getHecatacombBoost(selectedProfile)

    // Daily runs can be inaccurate on the Hypixel API. If you have not done a run today, your last daily run count will be returned rather than 0.
    const dailyCompletedRuns = selectedProfile.dungeons.daily_runs?.completed_runs_count ?? 0
    const dailyRemainingRuns = Math.max(5 - dailyCompletedRuns, 0)

    const globalBoost = await this.getGlobalBoost(context)

    const floorNumber = Number(selectedFloor.replace('m', '')) as 1 | 2 | 3 | 4 | 5 | 6 | 7
    const currentRuns = selectedProfile.dungeons.dungeon_types.master_catacombs?.tier_completions?.[floorNumber] ?? 0

    const floorBoost = this.getFloorBoost(selectedFloor as keyof typeof FloorsBaseExp, currentRuns)

    const baseXP = FloorsBaseExp[selectedFloor as keyof typeof FloorsBaseExp]

    let totalXP = currentXP
    let remainingRuns = 0

    while (totalXP < targetXP) {
      const runNumber = currentRuns + remainingRuns + 1

      const baseXPBoost = runNumber > 5 ? 2 : 1
      const dailyBoost = remainingRuns < dailyRemainingRuns ? 0.4 : 0
      const profileBoosts = bonzoShardsBoost + expertRingBoost + hecatombBoost + dailyBoost
      const xpMultiplier = (1 + floorBoost) * (1 + profileBoosts + globalBoost)
      const xpPerRun = baseXP * baseXPBoost * xpMultiplier

      totalXP += xpPerRun
      remainingRuns++
    }

    return `${givenUsername} is ${remainingRuns} ${selectedFloor} away from catacombs ${targetLevel}`
  }

  private getBonzoShardBoost(profile: SkyblockMember): number {
    const bonzoShards = profile.attributes?.stacks.catacombs_explorer ?? 0

    if (bonzoShards >= 24) return 0.1
    else if (bonzoShards >= 19) return 0.09
    else if (bonzoShards >= 15) return 0.08
    else if (bonzoShards >= 12) return 0.07
    else if (bonzoShards >= 9) return 0.06
    else if (bonzoShards >= 7) return 0.05
    else if (bonzoShards >= 5) return 0.04
    else if (bonzoShards >= 3) return 0.03
    else if (bonzoShards >= 2) return 0.02
    else if (bonzoShards >= 1) return 0.01
    else return 0
  }

  // This class could be refactored to only account for 1 accessory instead of multiple
  private async getExpertRingBoost(profile: SkyblockMember): Promise<number> {
    const Accessory = { CATACOMBS_EXPERT_RING: 0.1 }
    let expertRingBoost = 0

    const accessoriesRaw = profile.inventory?.bag_contents?.talisman_bag?.data
    if (accessoriesRaw !== undefined) {
      const accessories = await parseEncodedNbt<{ i: InventoryItem[] }>(accessoriesRaw)

      for (const item of accessories.i) {
        const itemId = item.tag?.ExtraAttributes?.id
        if (typeof itemId === 'string' && Object.keys(Accessory).includes(itemId)) {
          const itemBoost = Accessory[itemId as keyof typeof Accessory]
          if (itemBoost > expertRingBoost) expertRingBoost = itemBoost
        }
      }
    }

    const inventoryRaw = profile.inventory?.inv_contents?.data
    if (inventoryRaw !== undefined) {
      const inventory = await parseEncodedNbt<{ i: InventoryItem[] }>(inventoryRaw)

      for (const item of inventory.i) {
        const itemId = item.tag?.ExtraAttributes?.id
        if (typeof itemId === 'string' && Object.keys(Accessory).includes(itemId)) {
          const itemBoost = Accessory[itemId as keyof typeof Accessory]
          if (itemBoost > expertRingBoost) expertRingBoost = itemBoost
        }
      }
    }

    return expertRingBoost
  }

  private async getHecatacombBoost(profile: SkyblockMember): Promise<number> {
    const HecatombEnchantment = {
      1: 0.0028,
      2: 0.0036,
      3: 0.0044,
      4: 0.0052,
      5: 0.006,
      6: 0.0068,
      7: 0.0076,
      8: 0.0084,
      9: 0.0092,
      10: 0.01
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
  private getFloorBoost(floor: keyof typeof FloorsBaseExp, currentRuns: number): number {
    const FloorBoost = 0.02
    if (floor === 'm7') {
      if (currentRuns === 0) return 0
      return FloorBoost * (Math.min(currentRuns, 26) - 1)
    }

    return 0
  }

  private async getGlobalBoost(context: ChatCommandContext): Promise<number> {
    let totalBoost = 0

    const government = await context.app.hypixelApi.getSkyblockElection()
    if (government.mayor.key === 'aura' || government.mayor.key === 'derpy') {
      totalBoost += 0.5
    }

    return totalBoost
  }
}
