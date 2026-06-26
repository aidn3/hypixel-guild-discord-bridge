import assert from 'node:assert'

import { createCache } from 'async-cache-dedupe'
import axios, { AxiosError } from 'axios'

import Duration from '../../utility/duration'
import { sleep } from '../../utility/shared-utility'

import type { HypixelFailResponse, HypixelSuccessResponse } from './hypixel-api'

export class HypixelFetcher {
  private static readonly MaxRetries = 3
  private static readonly DefaultRetryCooldown = Duration.minutes(5) // current hypixel api resets ratelimit
  private static readonly GatewayRetry = Duration.seconds(5)

  private readonly singleston

  constructor(
    private readonly baseUrl: string,
    private readonly key: string
  ) {
    this.singleston = createCache().define('fetchHypixel', (request: ApiEntry) => this.retriableFetch(request))
  }

  public async fetch<T extends HypixelSuccessResponse>(request: ApiEntry): Promise<T> {
    try {
      return (await this.singleston.fetchHypixel(request)) as T
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const hypixelError = (error as AxiosError<HypixelFailResponse>).response?.data
        switch (error.status) {
          case 403: {
            throw new HypixelApiFail(
              request,
              hypixelError ?? { success: false, message: 'Invalid API key' },
              HypixelFailType.Authentication
            )
          }
          case 429: {
            throw new HypixelApiFail(
              request,
              hypixelError ?? { success: false, message: 'API is throttled.' },
              HypixelFailType.Throttle
            )
          }
        }
      }

      throw error
    }
  }

  private async retriableFetch<T extends HypixelSuccessResponse>(request: ApiEntry): Promise<T> {
    const parameters = this.parameterize(request)

    const maxRetries = HypixelFetcher.MaxRetries
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const result = await axios.get<T>(request.path, {
          baseURL: this.baseUrl,
          params: parameters,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          headers: { 'API-Key': this.key }
        })

        assert.ok(result.status === 200)
        assert.strictEqual(result.data.success, true)
        return result.data
      } catch (error: unknown) {
        if (retry + 1 < maxRetries && error instanceof AxiosError) {
          const shouldRetry = this.shouldRetryAfter(error)
          if (shouldRetry !== undefined) {
            await sleep(shouldRetry.toMilliseconds())
            continue
          }
        }

        throw error
      }
    }

    assert.notStrictEqual(maxRetries, 0)
    assert.fail(`unknown state`)
  }

  private shouldRetryAfter(error: AxiosError): Duration | undefined {
    if (error.status === undefined) return this.getRetryAfter(error) ?? HypixelFetcher.DefaultRetryCooldown
    if (error.status >= 500 && error.status <= 599) return this.getRetryAfter(error) ?? HypixelFetcher.GatewayRetry
    if (error.status === 429) return this.getRetryAfter(error) ?? HypixelFetcher.DefaultRetryCooldown

    return undefined
  }

  private getRetryAfter(error: AxiosError): Duration | undefined {
    const hypixelHeader = error.response?.headers['ratelimit-reset'] as unknown
    if (typeof hypixelHeader === 'number') return Duration.seconds(hypixelHeader)

    const officialHeader = error.response?.headers['retry-after'] as unknown
    if (typeof officialHeader === 'number') return Duration.seconds(officialHeader)

    return undefined
  }

  private parameterize(request: ApiEntry): Record<string, string> {
    const parameters: Record<string, string> = {}

    if ('key' in request) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert.ok(request.key !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert.ok(request.value !== undefined)

      parameters[request.key] = request.value
    }

    return parameters
  }
}

export type ApiEntry = ApiEntryWithoutOption | ApiEntryWithOption

export interface ApiEntryWithoutOption {
  path: string
}

export interface ApiEntryWithOption {
  path: string
  key: string
  value: string
}

export class HypixelApiFail extends Error {
  constructor(
    public readonly request: ApiEntry,
    public readonly response: HypixelFailResponse,
    public readonly type: HypixelFailType
  ) {
    super()
  }
}

export enum HypixelFailType {
  Authentication = 'authentication',
  Throttle = 'throttle',
  Other = 'other'
}
