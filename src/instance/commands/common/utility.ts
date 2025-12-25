import assert from 'node:assert'

import type { Client, SkyblockMember, SkyblockV2Member, SkyblockV2Profile } from 'hypixel-api-reborn'

import type { MojangApi } from '../../../core/users/mojang'

import type { ChatCommandContext } from 'src/common/commands'

export async function getUuidIfExists(mojangApi: MojangApi, username: string): Promise<string | undefined> {
  return await mojangApi
    .profileByUsername(username)
    .then((mojangProfile) => mojangProfile.id)
    .catch(() => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      return undefined
    })
}

export async function getSelectedSkyblockProfileRaw(
  hypixelApi: Client,
  uuid: string
): Promise<SkyblockV2Member | undefined> {
  const response = await hypixelApi.getSkyblockProfiles(uuid, { raw: true })

  if (!response.profiles) return undefined
  const profile = response.profiles.find((p) => p.selected)

  const selected = profile?.members[uuid]
  assert.ok(selected)
  return selected
}

export async function getSelectedSkyblockProfileData(
  hypixelApi: Client,
  uuid: string
): Promise<{ profile: SkyblockV2Profile; member: SkyblockV2Member } | undefined> {
  const response = await hypixelApi.getSkyblockProfiles(uuid, { raw: true })

  if (!response.profiles) return undefined
  const profile = response.profiles.find((p) => p.selected)
  if (!profile) return undefined

  const member = profile.members[uuid]
  if (!member) return undefined

  return { profile, member }
}

export async function getSelectedSkyblockProfile(hypixelApi: Client, uuid: string): Promise<SkyblockMember> {
  return await hypixelApi.getSkyblockProfiles(uuid).then((profiles) => {
    const profile = profiles.find((profile) => profile.selected)?.me
    assert.ok(profile)
    return profile
  })
}

export function getDungeonLevelWithOverflow(experience: number): number {
  const DungeonXp = [
    50, 75, 110, 160, 230, 330, 470, 670, 950, 1340, 1890, 2665, 3760, 5260, 7380, 10_300, 14_400, 20_000, 27_600,
    38_000, 52_500, 71_500, 97_000, 132_000, 180_000, 243_000, 328_000, 445_000, 600_000, 800_000, 1_065_000, 1_410_000,
    1_900_000, 2_500_000, 3_300_000, 4_300_000, 5_600_000, 7_200_000, 9_200_000, 1.2e7, 1.5e7, 1.9e7, 2.4e7, 3e7, 3.8e7,
    4.8e7, 6e7, 7.5e7, 9.3e7, 1.1625e8
  ]
  const PerLevel = 200_000_000
  const Max50Xp = 569_809_640

  if (experience > Max50Xp) {
    // account for overflow
    const remainingExperience = experience - Max50Xp
    const extraLevels = Math.floor(remainingExperience / PerLevel)
    const fractionLevel = (remainingExperience % PerLevel) / PerLevel

    return 50 + extraLevels + fractionLevel
  }

  let totalLevel = 0
  let remainingXP = experience

  for (const [index, levelXp] of DungeonXp.entries()) {
    if (remainingXP > levelXp) {
      totalLevel = index + 1
      remainingXP -= levelXp
    } else {
      break
    }
  }

  const fractionLevel = remainingXP / DungeonXp[totalLevel]
  return totalLevel + fractionLevel
}

export function shortenNumber(value: number): string {
  if (value === 0) return value.toFixed(0)
  let suffix = ''

  if (value > 1000) {
    value = value / 1000
    suffix = 'k'
  }
  if (value > 1000) {
    value = value / 1000
    suffix = 'm'
  }
  if (value > 1000) {
    value = value / 1000
    suffix = 'b'
  }
  if (value > 1000) {
    value = value / 1000
    suffix = 't'
  }

  const digits = Math.floor(Math.log10(Math.abs(value))) + 1
  const digitsCount = 3

  return value.toFixed(Math.max(0, digitsCount - digits)) + suffix
}

export function capitalize(name: string): string {
  return name.slice(0, 1).toUpperCase() + name.slice(1).toLowerCase()
}

export function usernameNotExists(context: ChatCommandContext, givenUsername: string): string {
  return context.app.i18n.t(($) => $['commands.error.username-not-exists'], { username: givenUsername })
}

export function canOnlyUseIngame(context: ChatCommandContext): string {
  return context.app.i18n.t(($) => $['commands.error.must-be-ingame'], { username: context.username })
}

export function playerNeverPlayedHypixel(context: ChatCommandContext, username: string): string {
  return context.app.i18n.t(($) => $['commands.error.never-joined-hypixel'], { username: username })
}

export function playerNeverPlayedSkyblock(context: ChatCommandContext, username: string): string {
  return context.app.i18n.t(($) => $['commands.error.never-joined-skyblock'], { username: username })
}

export function playerNeverPlayedDungeons(username: string): string {
  return `${username} has never played dungeons before?`
}

export function playerNeverPlayedSlayers(username: string): string {
  return `${username} has never done slayers before?`
}

export function playerNeverEnteredCrimson(username: string): string {
  return `${username} has never entered Crimson Isle before?`
}
