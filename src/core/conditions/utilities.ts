import assert from 'node:assert'

import type { TFunction } from 'i18next'

import type { MojangProfile } from '../../common/user'
import type { HypixelPlayer } from '../hypixel/hypixel-player'
import type { SkyblockMember, SkyblockProfile } from '../hypixel/hypixel-skyblock-types'

import type { ConditionValue, HandlerOperationContext, HandlerUser, SkyblockProfileOptionType } from './common'

export async function checkSkyblockEntireProfiles(
  context: HandlerOperationContext,
  handlerUser: HandlerUser,
  checker: (profile: SkyblockProfile) => boolean
): Promise<boolean> {
  const mojangProfile = handlerUser.user.mojangProfile()
  if (mojangProfile === undefined) return false
  const uuid = mojangProfile.id
  let profiles: SkyblockProfile[] | undefined

  try {
    profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (profiles === undefined) return false
  } catch {
    return false
  }

  for (const skyblockProfile of profiles) {
    if (checker(skyblockProfile)) return true
  }

  return false
}

export async function getSkyblockUserProfiles(
  context: HandlerOperationContext,
  mojangProfile: MojangProfile,
  allowedProfiles: SkyblockProfileOptionType['profileTypes']
): Promise<SkyblockMember[]> {
  const uuid = mojangProfile.id
  const profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
  if (profiles === undefined) return []

  const result = []
  for (const profile of profiles) {
    const profileType = profile.game_mode ?? 'classic'
    if (allowedProfiles.includes(profileType)) {
      result.push(profile.members[mojangProfile.id])
    }
  }

  return result
}

export async function checkHypixelProfile(
  context: HandlerOperationContext,
  handlerUser: HandlerUser,
  checker: (player: HypixelPlayer) => boolean
): Promise<boolean> {
  const mojangProfile = handlerUser.user.mojangProfile()
  if (mojangProfile === undefined) return false
  const uuid = mojangProfile.id
  let player: HypixelPlayer | undefined

  try {
    player = await context.application.hypixelApi.getPlayer(uuid, context.startTime)
    if (player === undefined) return false
  } catch {
    return false
  }

  return checker(player)
}
export async function checkHypixelGuild(
  context: HandlerOperationContext,
  handlerUser: HandlerUser,
  checker: (profile: SkyblockMember) => boolean
): Promise<boolean> {
  const mojangProfile = handlerUser.user.mojangProfile()
  if (mojangProfile === undefined) return false
  const uuid = mojangProfile.id
  let profiles: SkyblockProfile[] | undefined

  try {
    profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (profiles === undefined) return false
  } catch {
    return false
  }

  for (const skyblockProfile of profiles) {
    if (checker(skyblockProfile.members[mojangProfile.id])) return true
  }

  return false
}

export function formatPrimitiveValue(t: TFunction, value: ConditionValue): string {
  if (typeof value === 'string') return value
  else if (typeof value === 'boolean') {
    if (value) return t(($) => $['conditions.format.true'])
    return t(($) => $['conditions.format.false'])
  } else if (typeof value === 'number') {
    return t(($) => $['conditions.format.number'], { value })
  } else {
    value satisfies never
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    assert.fail(`Unknown value type: ${value}`)
  }
}
