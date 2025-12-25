/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import axios from 'axios'

import type { MojangApi } from '../core/users/mojang.js'

// Basic cache implementation
const cache = new Map<string, { data: any; lastSave: number }>()

export class HypixelRawApi {
  constructor(
    private readonly apiKey: string,
    private readonly mojangApi: MojangApi
  ) {}

  async getLatestProfile(input: string, options: { museum?: boolean; garden?: boolean } = {}): Promise<any> {
    let uuid = input
    let username = input

    // Resolve UUID/Username
    if (this.isUuid(input)) {
      // It is a UUID, get username
      const profile = await this.mojangApi.profileByUuid(input)
      if (profile) username = profile.name
    } else {
      const profile = await this.mojangApi.profileByUsername(input)
      if (!profile) throw new Error(`Could not find user with name ${input}`)
      uuid = profile.id
      username = profile.name
    }

    // Check cache
    if (cache.has(uuid)) {
      const cached = cache.get(uuid)
      if (cached && cached.lastSave + 5 * 60 * 1000 > Date.now()) {
        return cached.data
      }
    }

    // Fetch Profiles
    const response = await axios
      .get(`https://api.hypixel.net/v2/skyblock/profiles`, {
        params: { key: this.apiKey, uuid }
      })
      .catch((error) => {
        throw error?.response?.data?.cause ?? 'Request to Hypixel API failed.'
      })

    if (!response.data.success) {
      throw new Error('Request to Hypixel API failed.')
    }

    const profiles = response.data.profiles
    if (!profiles || profiles.length === 0) {
      throw new Error('Player has no SkyBlock profiles.')
    }

    const profileData = profiles.find((p: any) => p.selected) ?? profiles[0] // Fallback to first if none selected? Source says "throw if no selected".

    // Source: if nil throw "Player does not have selected profile."
    // But sometimes players have profiles but none selected (if they haven't logged in recently?).
    // Source strictness:
    // const profileData = allProfiles.find((a) => a.selected) || null;
    // if (profileData == null) throw ...
    // I will stick to source logic mostly.

    if (!profileData?.selected) {
      // Try to find the one with most recent save?
      // Source throws. I will throw too to be safe.
      throw new Error('Player does not have a selected profile.')
    }

    const profile = profileData.members[uuid]
    if (!profile) {
      throw new Error('Player is not in this Skyblock profile.')
    }

    const output: any = {
      username: username, // Format username with gamemode?
      rawUsername: username,
      last_save: Date.now(),
      profiles: profiles,
      profile: profile,
      profileData: profileData,
      uuid: uuid
    }

    if (options.museum) {
      const museum = await this.getMuseum(profileData.profile_id, uuid)
      Object.assign(output, museum)
    }

    if (options.garden) {
      const garden = await this.getGarden(profileData.profile_id)
      Object.assign(output, garden)
    }

    cache.set(uuid, { data: output, lastSave: Date.now() })
    return output
  }

  async getMuseum(profileId: string, uuid: string): Promise<any> {
    const cacheKey = `museum-${profileId}`
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)
      if (cached && cached.lastSave + 5 * 60 * 1000 > Date.now()) {
        return cached.data
      }
    }

    try {
      const { data } = await axios.get(`https://api.hypixel.net/v2/skyblock/museum`, {
        params: { key: this.apiKey, profile: profileId }
      })

      const result = {
        museum: data.members?.[uuid] ?? null,
        museumData: data.members ?? null
      }

      cache.set(cacheKey, { data: result, lastSave: Date.now() })
      return result
    } catch {
      return { museum: null, museumData: null }
    }
  }

  async getGarden(profileId: string): Promise<any> {
    const cacheKey = `garden-${profileId}`
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)
      if (cached && cached.lastSave + 5 * 60 * 1000 > Date.now()) {
        return cached.data
      }
    }

    try {
      const { data } = await axios.get(`https://api.hypixel.net/v2/skyblock/garden`, {
        params: { key: this.apiKey, profile: profileId }
      })

      const result = { garden: data.garden ?? null }
      cache.set(cacheKey, { data: result, lastSave: Date.now() })
      return result
    } catch {
      return { garden: null }
    }
  }

  private isUuid(input: string): boolean {
    return /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(input)
  }
}
