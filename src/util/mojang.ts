import type { AxiosResponse } from 'axios'
import axios from 'axios'
import NodeCache from 'node-cache'

export class MojangApi {
  private readonly cache = new NodeCache({ maxKeys: 10_000, stdTTL: 24 * 60 * 60 })

  async profileByUsername(username: string): Promise<MojangProfile> {
    const cachedResult = this.cache.get<MojangProfile>(username.toLowerCase())
    if (cachedResult) return cachedResult

    const result = await axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      .then((response: AxiosResponse<MojangProfile, unknown>) => response.data)

    this.cache.set<MojangProfile>(result.name.toLowerCase(), result)
    return result
  }

  async profilesByUsername(usernames: string[]): Promise<MojangProfile[]> {
    const partialResult = usernames
      .map((username) => this.cache.get<MojangProfile>(username.toLowerCase()))
      .filter((entry) => entry !== undefined)

    const leftUsernames = usernames.filter(
      (username) => !partialResult.some((result) => username.toLowerCase() === result.name.toLowerCase())
    )

    if (leftUsernames.length === 0) return partialResult

    const result = await axios
      .post(`https://api.mojang.com/profiles/minecraft`, leftUsernames)
      .then((response: AxiosResponse<MojangProfile[], unknown>) => response.data)

    for (const mojangProfile of result) {
      this.cache.set<MojangProfile>(mojangProfile.name.toLowerCase(), mojangProfile)
    }

    return [...result, ...partialResult]
  }
}

export interface MojangProfile {
  id: string
  name: string
}
