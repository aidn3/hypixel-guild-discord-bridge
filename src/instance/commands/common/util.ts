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

export async function fetchBitItemPrice(item: string): Promise<number | undefined> {
  let price: number | undefined;
  try {
    const response = await fetch(`https://sky.coflnet.com/api/item/price/${item}/current?count=1`);

    if (!response.ok) {
      // If response status is not OK, log it and return undefined
      console.error(`API request failed with status ${response.status} for item ${item}`);
      console.error(response)
      return undefined;
    }

    if (!response.headers.get('Content-Type')?.includes('application/json')) {
      // If response is not JSON, log it and return undefined
      console.error(`Expected JSON response for item ${item}, got '${response.headers.get('Content-Type')}'`);
      return undefined;
    }

    const data = await response.json() as { buy?: number };
    price = data.buy;
  } catch (error) {
    console.error(`Failed to fetch price for ${item}`, error);
  }
  return price;
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
