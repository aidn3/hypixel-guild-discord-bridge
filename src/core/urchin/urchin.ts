import { TTLCache } from '@isaacs/ttlcache'
import DefaultAxios, { AxiosError, HttpStatusCode } from 'axios'
import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import Duration from '../../utility/duration.js'
import RateLimiter from '../../utility/rate-limiter.js'

import type { UrchinPlayerResponse } from './urchin-api.js'

export class Urchin {
  private static readonly ApiPath = 'https://api.urchin.gg/v3'

  private static readonly RetryCount = 3

  private readonly queue = new PromiseQueue(1)
  private readonly rateLimit = new RateLimiter(1, 500)
  private readonly cache = new TTLCache<string, UrchinPlayerResponse>({
    max: 1000,
    ttl: Duration.minutes(5).toMilliseconds()
  })

  constructor(
    private readonly key: string,
    private readonly logger: Logger
  ) {}

  async getTags(username: string): Promise<UrchinPlayerResponse | undefined> {
    const cacheKey = username.toLowerCase()
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) return cached

    const result = await this.queue.add(async () => {
      let lastError: Error | undefined
      for (let retry = 0; retry < Urchin.RetryCount; retry++) {
        await this.rateLimit.wait()

        try {
          return await DefaultAxios.get<UrchinPlayerResponse>(`${Urchin.ApiPath}/player/tags`, {
            params: {
              player: username,
              key: this.key
            }
          }).then((response) => response.data)
        } catch (error: unknown) {
          if (error instanceof Error) lastError = error

          if (error instanceof AxiosError) {
            if (error.status === HttpStatusCode.TooManyRequests) continue
            if (error.status === HttpStatusCode.NotFound) return
            if (error.status === HttpStatusCode.Unauthorized || error.status === HttpStatusCode.Forbidden) {
              this.logger.error(`Urchin API key error: ${error.message}`)
              return
            }
          }

          throw error
        }
      }

      throw lastError ?? new Error('Failed fetching Urchin data')
    })

    if (result !== undefined) {
      this.cache.set(cacheKey, result)
    }

    return result
  }
}
