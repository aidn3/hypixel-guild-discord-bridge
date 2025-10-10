import assert from 'node:assert'

import DefaultAxios, { AxiosError, HttpStatusCode } from 'axios'
import PromiseQueue from 'promise-queue'

import type Application from '../application.js'
import type { MojangProfile } from '../common/user'

import RateLimiter from './rate-limiter.js'

export class MojangApi {
  private static readonly RetryCount = 3
  private readonly queue = new PromiseQueue(1)
  private readonly rateLimit = new RateLimiter(1, 800)

  constructor(private readonly application: Application) {}

  async profileByUsername(username: string): Promise<MojangProfile> {
    const cachedResult = this.application.usersManager.mojangDatabase.profileByUsername(username)
    if (cachedResult) return cachedResult

    const result = await this.queue.add(async () => {
      let lastError: Error | undefined
      for (let retry = 0; retry < MojangApi.RetryCount; retry++) {
        await this.rateLimit.wait()

        try {
          return await DefaultAxios.get<MojangProfile>(
            `https://api.minecraftservices.com/minecraft/profile/lookup/name/${username}`
          ).then((response) => response.data)
        } catch (error: unknown) {
          if (error instanceof Error) lastError = error
          if (error instanceof AxiosError && error.status === HttpStatusCode.TooManyRequests) continue

          throw error
        }
      }

      throw lastError ?? new Error('Failed fetching new data')
    })

    this.application.usersManager.mojangDatabase.add([result])
    return result
  }

  async profileByUuid(uuid: string): Promise<MojangProfile> {
    assert.ok(uuid.length === 32 || uuid.length === 36, `'uuid' must be valid UUID. given ${uuid}`)

    const cachedResult = this.application.usersManager.mojangDatabase.profileByUuid(uuid)
    if (cachedResult) return cachedResult

    const result = await this.queue.add(async () => {
      let lastError: Error | undefined

      for (let retry = 0; retry < MojangApi.RetryCount; retry++) {
        await this.rateLimit.wait()

        try {
          return await DefaultAxios.get<MojangProfile>(
            `https://api.minecraftservices.com/minecraft/profile/lookup/${uuid}`
          ).then((response) => response.data)
        } catch (error: unknown) {
          if (error instanceof Error) lastError = error
          if (error instanceof AxiosError && error.status === HttpStatusCode.TooManyRequests) continue

          throw error
        }
      }

      throw lastError ?? new Error('Failed fetching new data')
    })

    this.application.usersManager.mojangDatabase.add([result])
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
      const cachedProfile = this.application.usersManager.mojangDatabase.profileByUsername(username)
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
    const result = await this.queue.add(async () => {
      let lastError: Error | undefined
      for (let retry = 0; retry < MojangApi.RetryCount; retry++) {
        await this.rateLimit.wait()
        try {
          return await DefaultAxios.post<MojangProfile[]>(
            `https://api.minecraftservices.com/minecraft/profile/lookup/bulk/byname`,
            usernames
          ).then((response) => response.data)
        } catch (error: unknown) {
          if (error instanceof Error) lastError = error
          if (error instanceof AxiosError && error.status === HttpStatusCode.TooManyRequests) continue

          throw error
        }
      }

      throw lastError ?? new Error('Failed fetching new data')
    })

    this.application.usersManager.mojangDatabase.add(result)
    return result
  }
}
