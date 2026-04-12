import type { HypixelPlayer } from '../hypixel/hypixel-player'
import type { SkyblockMember, SkyblockProfile } from '../hypixel/hypixel-skyblock-types'

import type { HandlerOperationContext, HandlerUser, SkyblockProfileOptionType } from './common'

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
  handlerUser: HandlerUser,
  allowedProfiles: SkyblockProfileOptionType['profileTypes']
): Promise<SkyblockMember[]> {
  const mojangProfile = handlerUser.user.mojangProfile()
  if (mojangProfile === undefined) return []
  const uuid = mojangProfile.id
  let profiles: SkyblockProfile[] | undefined

  try {
    profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (profiles === undefined) return []
  } catch {
    return []
  }

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
