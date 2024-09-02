import assert from 'node:assert'

import type { Client, SkyblockMember, SkyblockV2Member } from 'hypixel-api-reborn'

import type { MojangApi } from '../../../util/mojang.js'

export async function getUuidIfExists(mojangApi: MojangApi, username: string): Promise<string | undefined> {
  const result = await mojangApi
    .profileByUsername(username)
    .then((mojangProfile) => mojangProfile.id)
    .catch(() => {
      /* return undefined */
    })

  return result || undefined
}

export async function getSelectedSkyblockProfileRaw(hypixelApi: Client, uuid: string): Promise<SkyblockV2Member> {
  return await hypixelApi
    .getSkyblockProfiles(uuid, { raw: true })
    .then((response) => response.profiles.find((p) => p.selected))
    .then((profiles) => profiles?.members[uuid])
    .then((profile) => {
      assert(profile)
      return profile
    })
}

export async function getSelectedSkyblockProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember> {
  return await hypixelApi.getSkyblockProfiles(uuid).then((profiles) => {
    const profile = profiles.find((profile) => profile.selected)?.me
    assert(profile)
    return profile
  })
}

export function getDungeonLevelWithOverflow(experience: number): number {
  const DUNGEON_XP = [
    50, 75, 110, 160, 230, 330, 470, 670, 950, 1340, 1890, 2665, 3760, 5260, 7380, 10_300, 14_400, 20_000, 27_600,
    38_000, 52_500, 71_500, 97_000, 132_000, 180_000, 243_000, 328_000, 445_000, 600_000, 800_000, 1_065_000, 1_410_000,
    1_900_000, 2_500_000, 3_300_000, 4_300_000, 5_600_000, 7_200_000, 9_200_000, 1.2e7, 1.5e7, 1.9e7, 2.4e7, 3e7, 3.8e7,
    4.8e7, 6e7, 7.5e7, 9.3e7, 1.1625e8
  ]
  const PER_LEVEL = 200_000_000
  const MAX_50_XP = 569_809_640

  if (experience > MAX_50_XP) {
    // account for overflow
    const remainingExperience = experience - MAX_50_XP
    const extraLevels = Math.floor(remainingExperience / PER_LEVEL)
    const fractionLevel = (remainingExperience % PER_LEVEL) / PER_LEVEL

    return 50 + extraLevels + fractionLevel
  }

  let totalLevel = 0
  let remainingXP = experience

  for (const [index, levelXp] of DUNGEON_XP.entries()) {
    if (remainingXP > levelXp) {
      totalLevel = index + 1
      remainingXP -= levelXp
    } else {
      break
    }
  }

  const fractionLevel = remainingXP / DUNGEON_XP[totalLevel]
  return totalLevel + fractionLevel
}
