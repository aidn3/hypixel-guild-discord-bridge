import { TTLCache } from '@isaacs/ttlcache'

import Duration from '../../utility/duration'

import type { ApiEntry } from './hypixel'
import type { HypixelSuccessResponse } from './hypixel-api'

export class HypixelCache {
  private static readonly LocalShortCache = Duration.minutes(5)
  private static readonly LocalValueCache = 100
  private static readonly LocalKeyCache = HypixelCache.LocalValueCache * 100

  private readonly cacheKey = new TTLCache<string, number>({
    ttl: HypixelCache.LocalShortCache.toMilliseconds(),
    max: HypixelCache.LocalKeyCache
  })
  private readonly cacheValue = new TTLCache<number, CacheEntry<HypixelSuccessResponse>>({
    ttl: HypixelCache.LocalShortCache.toMilliseconds(),
    max: HypixelCache.LocalValueCache
  })
  private currentId = 0

  public add(requests: ApiEntry[], createdAt: number, response: HypixelSuccessResponse): void {
    const id = ++this.currentId
    for (const request of requests) {
      this.cacheKey.set(this.serialize(request), id)
    }

    this.cacheValue.set(id, { createdAt: createdAt, content: response })
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  public get<T extends HypixelSuccessResponse>(request: ApiEntry, since: number): T | undefined {
    const id = this.cacheKey.get(this.serialize(request))
    if (id === undefined) return undefined

    const result = this.cacheValue.get(id)
    if (result === undefined) return undefined

    if (result.createdAt < since) return undefined
    return result.content as T
  }
  /*
   * Primitive serialization but works in this case
   */
  private serialize(request: ApiEntry): string {
    let result = ''
    result += request.path
    if ('key' in request) {
      result += `:${request.key}:${request.value}`
    }
    return result
  }
}

interface CacheEntry<T extends HypixelSuccessResponse> {
  createdAt: number
  content: T
}
