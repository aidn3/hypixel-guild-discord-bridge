import assert from 'node:assert'

import type { Client, SkyblockMember, SkyblockV2Member } from 'hypixel-api-reborn'

import type { MojangApi } from '../../../util/mojang'

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
