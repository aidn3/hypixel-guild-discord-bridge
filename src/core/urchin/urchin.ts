import { TTLCache } from '@isaacs/ttlcache'
import DefaultAxios, { AxiosError, HttpStatusCode } from 'axios'
import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import Duration from '../../utility/duration'
import RateLimiter from '../../utility/rate-limiter'

import type { UrchinPlayerResponse } from './urchin-api'

export class Urchin {
  private static readonly ApiPath = 'https://urchin.ws'
  private static readonly PlayerPath = '/player'

  private static readonly RetryCount = 3
  private static readonly DefaultSources = 'GAME,PARTY,PARTY_INVITES,CHAT,CHAT_MENTIONS,MANUAL,ME'

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

  async getPlayer(username: string, sources?: string): Promise<UrchinPlayerResponse | undefined> {
    const cacheKey = username.toLowerCase()
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) return cached

    const result = await this.queue.add(async () => {
      let lastError: Error | undefined
      for (let retry = 0; retry < Urchin.RetryCount; retry++) {
        await this.rateLimit.wait()

        try {
          return await DefaultAxios.get<UrchinPlayerResponse>(
            `${Urchin.ApiPath}${Urchin.PlayerPath}/${encodeURIComponent(username)}`,
            {
              params: {
                key: this.key,
                sources: sources ?? Urchin.DefaultSources
              }
            }
          ).then((response) => response.data)
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
