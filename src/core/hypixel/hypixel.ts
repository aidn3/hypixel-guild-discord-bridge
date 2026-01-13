import assert from 'node:assert'

import axios from 'axios'
import type { Logger } from 'log4js'

import type { SqliteManager } from '../../common/sqlite-manager'
import Duration from '../../utility/duration'

import type { HypixelSuccessResponse } from './hypixel-api'
import { HypixelCache } from './hypixel-cache'
import { HypixelDatabase } from './hypixel-database'
import type { HypixelGuild, HypixelGuildResponse } from './hypixel-guild'
import type { HypixelLeaderboards, HypixelLeaderboardsResponse } from './hypixel-leaderboards'
import type { HypixelPlayer, HypixelPlayerResponse } from './hypixel-player'
import type {
  Bazaar,
  Garden,
  GardenResponse,
  HypixelSkyblockSkillsResponse,
  MayorResponse,
  NewsResponse,
  SkyblockMuseumResponse,
  SkyblockProfile,
  SkyblockProfilesResponse
} from './hypixel-skyblock-types'
import type { HypixelPlayerStatus, HypixelPlayerStatusResponse } from './hypixel-status'

export class Hypixel {
  private static readonly ApiPath = 'https://api.hypixel.net'

  private static readonly SkyblockProfilePath = '/v2/skyblock/profiles'
  private static readonly SkyblockMuseumPath = '/v2/skyblock/museum'
  private static readonly SkyblockGardenPath = '/v2/skyblock/garden'
  private static readonly SkyblockBazaarPath = '/v2/skyblock/bazaar'

  private static readonly GuildPath = '/v2/guild'
  private static readonly PlayerPath = '/v2/player'
  private static readonly PlayerStatusPath = '/v2/status'
  private static readonly LeaderboardsPath = '/v2/leaderboards'

  private static readonly SkyblockElectionPath = '/v2/resources/skyblock/election'
  private static readonly SkyblockNewsPath = '/v2/skyblock/news'
  private static readonly SkyblockSkillsPath = '/v2/resources/skyblock/skills'

  /**
   * How old data can be and still be considered fresh by default.
   * @private
   */
  private static readonly DefaultCache = Duration.minutes(5)

  private readonly database: HypixelDatabase
  private readonly cache: HypixelCache = new HypixelCache()

  constructor(
    private readonly key: string,
    sqliteManager: SqliteManager,
    logger: Logger
  ) {
    this.database = new HypixelDatabase(sqliteManager, logger)
  }

  public async getSkyblockProfiles(playerUuid: string, since?: number): Promise<SkyblockProfile[] | undefined> {
    const request = { path: Hypixel.SkyblockProfilePath, key: 'uuid', value: playerUuid } satisfies ApiEntry
    const response = await this.resolveAndFetch<SkyblockProfilesResponse>(request, since)
    return response.profiles ?? undefined
  }

  public async getSkyblockGarden(
    profileId: SkyblockProfile['profile_id'],
    since?: number
  ): Promise<Garden | undefined> {
    const request = { path: Hypixel.SkyblockGardenPath, key: 'profile', value: profileId } satisfies ApiEntry
    const response = await this.resolveAndFetch<GardenResponse>(request, since)
    return response.garden
  }

  public async getSkyblockMuseum(
    profileId: SkyblockProfile['profile_id'],
    since?: number
  ): Promise<SkyblockMuseumResponse> {
    const request = { path: Hypixel.SkyblockMuseumPath, key: 'profile', value: profileId } satisfies ApiEntry
    const response = await this.resolveAndFetch<SkyblockMuseumResponse>(request, since)
    return response
  }

  public async getSkyblockElection(since?: number): Promise<MayorResponse> {
    const request = { path: Hypixel.SkyblockElectionPath } satisfies ApiEntry
    const response = await this.resolveAndFetch<MayorResponse>(request, since)
    return response
  }

  public async getSkyblockNews(since?: number): Promise<NewsResponse> {
    const request = { path: Hypixel.SkyblockNewsPath } satisfies ApiEntry
    const response = await this.resolveAndFetch<NewsResponse>(request, since)
    return response
  }

  public async getLeaderboards(since?: number): Promise<HypixelLeaderboards> {
    const request = { path: Hypixel.LeaderboardsPath } satisfies ApiEntry
    const response = await this.resolveAndFetch<HypixelLeaderboardsResponse>(request, since)
    return response.leaderboards
  }

  public async getSkyblockSkills(since?: number): Promise<HypixelSkyblockSkillsResponse> {
    const request = { path: Hypixel.SkyblockSkillsPath } satisfies ApiEntry
    const response = await this.resolveAndFetch<HypixelSkyblockSkillsResponse>(request, since)
    return response
  }

  public async getSkyblockBazaar(since?: number): Promise<Bazaar['products']> {
    const request = { path: Hypixel.SkyblockBazaarPath } satisfies ApiEntry
    const response = await this.resolveAndFetch<Bazaar>(request, since)
    return response.products
  }

  public async getGuildByPlayer(playerUuid: string, since?: number): Promise<HypixelGuild | undefined> {
    const request = { path: Hypixel.GuildPath, key: 'player', value: playerUuid } satisfies ApiEntry
    const response = await this.resolveAndFetch<HypixelGuildResponse>(request, since, (response) =>
      this.createGuildCacheEntries(request, response)
    )
    return response.guild ?? undefined
  }

  public async getGuildByName(guildName: string, since?: number): Promise<HypixelGuild | undefined> {
    const request = { path: Hypixel.GuildPath, key: 'name', value: guildName } satisfies ApiEntry
    const response = await this.resolveAndFetch<HypixelGuildResponse>(request, since, (response) =>
      this.createGuildCacheEntries(request, response)
    )
    return response.guild ?? undefined
  }

  public async getGuildById(guildId: HypixelGuild['_id'], since?: number): Promise<HypixelGuild | undefined> {
    const request = { path: Hypixel.GuildPath, key: 'id', value: guildId } satisfies ApiEntry
    const response = await this.resolveAndFetch<HypixelGuildResponse>(request, since, (response) =>
      this.createGuildCacheEntries(request, response)
    )
    return response.guild ?? undefined
  }

  public async getPlayer(playerUuid: string, since?: number): Promise<HypixelPlayer | undefined> {
    const request = { path: Hypixel.PlayerPath, key: 'uuid', value: playerUuid } satisfies ApiEntry
    const response = await this.resolveAndFetch<HypixelPlayerResponse>(request, since)
    return response.player
  }

  public async getPlayerStatus(playerUuid: string, since?: number): Promise<HypixelPlayerStatus> {
    const request = { path: Hypixel.PlayerStatusPath, key: 'uuid', value: playerUuid } satisfies ApiEntry
    const response = await this.resolveAndFetch<HypixelPlayerStatusResponse>(request, since)
    return response.session
  }

  private async resolveAndFetch<T extends HypixelSuccessResponse>(
    request: ApiEntry,
    since?: number,
    cacheRequests?: (result: T) => ApiEntry[]
  ): Promise<T> {
    const defaultSince = Date.now() - Hypixel.DefaultCache.toMilliseconds()

    const memoryCached = this.cache.get<T>(request, since ?? defaultSince)
    if (memoryCached !== undefined) return memoryCached

    const databaseCached = this.database.retrieve<T>(request, since ?? defaultSince)
    if (databaseCached !== undefined) {
      const requests = cacheRequests === undefined ? [request] : cacheRequests(databaseCached.content)
      this.cache.add(requests, databaseCached.createdAt, databaseCached.content)
      return databaseCached.content
    }

    const freshResponse = await this.fetch<T>(request)
    const currentTime = Date.now()
    const requests = cacheRequests === undefined ? [request] : cacheRequests(freshResponse)
    this.database.add(requests, currentTime, freshResponse)
    this.cache.add(requests, currentTime, freshResponse)

    return freshResponse
  }

  private async fetch<T extends HypixelSuccessResponse>(request: ApiEntry): Promise<T> {
    const parameters: Record<string, string> = {}
    if ('key' in request) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert.ok(request.key !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert.ok(request.value !== undefined)

      parameters[request.key] = request.value
    }

    const result = await axios.get<T>(request.path, {
      baseURL: Hypixel.ApiPath,
      params: parameters,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      headers: { 'API-Key': this.key }
    })

    assert.ok(result.status === 200)
    assert.strictEqual(result.data.success, true)
    return result.data
  }

  private createGuildCacheEntries(original: ApiEntryWithOption, response: HypixelGuildResponse): ApiEntryWithOption[] {
    if (response.guild == undefined) return [original]

    const guild = response.guild
    const entries: ApiEntryWithOption[] = []
    entries.push({ path: Hypixel.GuildPath, key: 'id', value: guild._id })
    entries.push({ path: Hypixel.GuildPath, key: 'name', value: guild.name })

    for (const member of guild.members) {
      entries.push({ path: Hypixel.GuildPath, key: 'player', value: member.uuid })
    }

    return entries
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
