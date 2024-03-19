import type { AxiosResponse } from 'axios'
import axios from 'axios'

export class MojangApi {
  private static readonly CACHE_MAX_LIFE = 24 * 60 * 60 * 1000 // 1 day
  private static readonly CACHE_CLEAN_EVERY = 60 * 60 * 1000 // 1 hour
  private cache = new Map<string, CachedMojangProfile>()
  private lastCacheCleanAt = 0

  async profileByUsername(username: string): Promise<MojangProfile> {
    this.cleanCache()
    const cachedResult = this.cache.get(username.toLowerCase())
    if (cachedResult) return cachedResult

    const result = await axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      .then((response: AxiosResponse<MojangProfile, unknown>) => response.data)

    this.cache.set(result.name.toLowerCase(), { ...result, fetchedAt: Date.now() })
    return result
  }

  async profilesByUsername(usernames: string[]): Promise<MojangProfile[]> {
    this.cleanCache()

    const partialResult = usernames
      .map((username) => this.cache.get(username.toLowerCase()))
      .filter((entry) => entry !== undefined) as CachedMojangProfile[]

    const leftUsernames = usernames.filter(
      (username) => !partialResult.some((result) => username.toLowerCase() === result.name.toLowerCase())
    )

    if (leftUsernames.length === 0) return partialResult

    const result = await axios
      .post(`https://api.mojang.com/profiles/minecraft`, leftUsernames)
      .then((response: AxiosResponse<MojangProfile[], unknown>) => response.data)

    const currentTime = Date.now()
    for (const mojangProfile of result) {
      this.cache.set(mojangProfile.name.toLowerCase(), { ...mojangProfile, fetchedAt: currentTime })
    }

    return [...result, ...partialResult]
  }

  private cleanCache(): void {
    const currentTime = Date.now()

    for (const key of Object.keys(this.cache.keys())) {
      const cachedResult = this.cache.get(key)!
      const valid = cachedResult.fetchedAt + MojangApi.CACHE_MAX_LIFE > currentTime
      if (!valid) {
        this.cache.delete(key)
      }
    }
  }
}

export interface MojangProfile {
  id: string
  name: string
}

type CachedMojangProfile = MojangProfile & { fetchedAt: number }
