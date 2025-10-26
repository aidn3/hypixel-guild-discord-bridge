import assert from 'node:assert'

import DefaultAxios, { AxiosError, HttpStatusCode } from 'axios'
import PromiseQueue from 'promise-queue'

import type { SqliteManager } from '../../common/sqlite-manager'
import type { MojangProfile } from '../../common/user'
import RateLimiter from '../../utility/rate-limiter'

export class MojangApi {
  private static readonly RetryCount = 3
  private readonly queue = new PromiseQueue(1)
  private readonly rateLimit = new RateLimiter(1, 800)

  private readonly mojangDatabase: MojangDatabase

  constructor(private readonly sqliteManager: SqliteManager) {
    this.mojangDatabase = new MojangDatabase(this.sqliteManager)
  }

  async profileByUsername(username: string): Promise<MojangProfile> {
    const cachedResult = this.mojangDatabase.profileByUsername(username)
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

    this.cache([result])
    return result
  }

  async profileByUuid(uuid: string): Promise<MojangProfile> {
    assert.ok(uuid.length === 32 || uuid.length === 36, `'uuid' must be valid UUID. given ${uuid}`)

    const cachedResult = this.mojangDatabase.profileByUuid(uuid)
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

    this.cache([result])
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
      const cachedProfile = this.mojangDatabase.profileByUsername(username)
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

  public cache(profiles: MojangProfile[]): void {
    this.mojangDatabase.add(profiles)
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

    this.cache(result)
    return result
  }
}

class MojangDatabase {
  private static readonly MaxAge = 7 * 24 * 60 * 60 * 1000

  constructor(private readonly sqliteManager: SqliteManager) {}

  public add(profiles: MojangProfile[]): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT OR REPLACE INTO "mojang" (uuid, username, loweredName) VALUES (@uuid, @username, @loweredName)'
    )

    const transaction = database.transaction(() => {
      for (const profile of profiles) {
        insert.run({ uuid: profile.id, username: profile.name, loweredName: profile.name.toLowerCase() })
      }
    })

    transaction()
  }

  public profileByUsername(username: string): MojangProfile | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      'SELECT uuid as id, username as name FROM "mojang" WHERE loweredName = @loweredName AND createdAt > @createdAt'
    )
    return select.get({
      loweredName: username.toLowerCase(),
      createdAt: Math.floor((Date.now() - MojangDatabase.MaxAge) / 1000)
    }) as MojangProfile | undefined
  }

  public profileByUuid(uuid: string): MojangProfile | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      'SELECT uuid as id, username as name FROM "mojang" WHERE uuid = @uuid AND createdAt > @createdAt'
    )
    return select.get({ uuid: uuid, createdAt: Math.floor((Date.now() - MojangDatabase.MaxAge) / 1000) }) as
      | MojangProfile
      | undefined
  }
}
