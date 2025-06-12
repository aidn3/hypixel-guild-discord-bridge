import type { AxiosResponse } from 'axios'
import Axios from 'axios'
import NodeCache from 'node-cache'

export class MojangApi {
  private readonly cache = new NodeCache({ maxKeys: 10_000, stdTTL: 24 * 60 * 60 })

  async profileByUsername(username: string): Promise<MojangProfile> {
    const cachedResult = this.cache.get<MojangProfile>(username.toLowerCase())
    if (cachedResult) return cachedResult

    const result = await Axios.get(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${username}`).then(
      (response: AxiosResponse<MojangProfile, unknown>) => response.data
    )

    this.cache.set<MojangProfile>(result.name.toLowerCase(), result)
    return result
  }

  async profileByUuid(uuid: string): Promise<MojangProfile> {
    for (const cachedUsername of this.cache.keys()) {
      const cachedProfile: MojangProfile | undefined = this.cache.get(cachedUsername)
      if (cachedProfile?.id === uuid) return cachedProfile
    }

    const result = await Axios.get(`https://api.minecraftservices.com/minecraft/profile/lookup/${uuid}`).then(
      (response: AxiosResponse<MojangProfile, unknown>) => response.data
    )

    this.cache.set(result.name.toLowerCase(), { ...result, fetchedAt: Date.now() })
    return result
  }

  async profilesByUsername(usernames: Set<string>): Promise<Map<string, string | undefined>> {
    const result = new Map<string, string | undefined>()

    const requests: Promise<void>[] = []

    const queue = (usernamesChunk: string[]) =>
      this.lookupUsernames(usernamesChunk)
        .then((profiles) => {
          for (const profile of profiles) {
            result.set(profile.name, profile.id)
          }

          const resolvedProfileNames = new Set(profiles.map((profile) => profile.name.toLowerCase()))
          for (const username of usernamesChunk) {
            if (!resolvedProfileNames.has(username.toLowerCase())) {
              result.set(username, undefined)
            }
          }
        })
        .catch(() => {
          for (const username of usernames) {
            result.set(username, undefined)
          }
        })

    const chunkSize = 10 // Mojang only allow up to 10 usernames per lookup
    let chunk: string[] = []
    for (const username of usernames) {
      const cachedProfile = this.cache.get<MojangProfile>(username.toLowerCase())
      if (cachedProfile !== undefined) {
        result.set(username, cachedProfile.id)
        continue
      }

      chunk.push(username)
      if (chunk.length >= chunkSize) {
        requests.push(queue(chunk))
        chunk = []
      }
    }
    if (chunk.length > 0) requests.push(queue(chunk))

    await Promise.all(requests)

    return result
  }

  private async lookupUsernames(usernames: string[]): Promise<MojangProfile[]> {
    const result = await Axios.post(
      `https://api.minecraftservices.com/minecraft/profile/lookup/bulk/byname`,
      usernames
    ).then((response: AxiosResponse<MojangProfile[], unknown>) => response.data)

    for (const mojangProfile of result) {
      this.cache.set<MojangProfile>(mojangProfile.name.toLowerCase(), mojangProfile)
    }

    return result
  }
}

export interface MojangProfile {
  id: string
  name: string
}
