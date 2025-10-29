import assert from 'node:assert'

import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import type Application from '../../application'
import { ChannelType, InstanceType } from '../../common/application-event'
import { ConfigManager } from '../../common/config-manager'
import { Status } from '../../common/connectable-instance'
import type EventHelper from '../../common/event-helper'
import type { SqliteManager } from '../../common/sqlite-manager'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import Duration from '../../utility/duration'
import type { Core } from '../core'

export default class ScoresManager extends SubInstance<Core, InstanceType.Core, void> {
  private static readonly DeleteMemberOlderThan = 365
  private static readonly DeleteMessagesOlderThan = 365
  private static readonly LeniencyTimeSeconds = 5 * 60

  private static readonly InstantInterval = 60 * 1000
  private static readonly FetchMembersEvery = 50 * 1000

  private static readonly ScoresExpireAt = Duration.minutes(1)

  private cachedPoints30Days: ActivityTotalPoints[] | undefined
  private lastUpdatePoints30Days = -1

  private cachedPointsAlltime: ActivityTotalPoints[] | undefined
  private lastUpdatePointsAlltime = -1

  private readonly queue = new PromiseQueue(1)
  readonly config: ConfigManager<ScoreManagerConfig>
  private readonly database: ScoreDatabase

  constructor(
    application: Application,
    clientInstance: Core,
    eventHelper: EventHelper<InstanceType.Core>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    sqliteManager: SqliteManager
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.config = new ConfigManager(application, logger, application.getConfigFilePath('scores-manager.json'), {
      deleteMessagesOlderThan: ScoresManager.DeleteMessagesOlderThan,
      deleteMembersOlderThan: ScoresManager.DeleteMemberOlderThan,
      leniencyTimeSeconds: ScoresManager.LeniencyTimeSeconds,

      minecraftBotUuids: []
    })

    this.database = new ScoreDatabase(this, sqliteManager)

    this.application.on('minecraftSelfBroadcast', (event) => {
      this.addBotUuid(event.uuid)
    })

    this.application.on('chat', (event) => {
      if (event.channelType !== ChannelType.Public) return

      switch (event.instanceType) {
        case InstanceType.Discord: {
          this.database.addDiscordMessage(event.user.discordProfile().id, this.timestamp())
          break
        }
        case InstanceType.Minecraft: {
          this.database.addMinecraftMessage(event.user.mojangProfile().id, this.timestamp())
        }
      }
    })

    this.application.on('command', (event) => {
      if (event.channelType !== ChannelType.Public) return

      switch (event.instanceType) {
        case InstanceType.Discord: {
          const profile = event.user.discordProfile()
          this.database.addDiscordCommand(profile.id, this.timestamp())
          break
        }
        case InstanceType.Minecraft: {
          const profile = event.user.mojangProfile()
          this.database.addMinecraftCommand(profile.id, this.timestamp())
        }
      }
    })

    setInterval(() => {
      void this.queue
        .add(async () => {
          await this.fetchGuilds()
        })
        .catch(this.errorHandler.promiseCatch('fetching guilds'))
    }, Duration.minutes(30).toMilliseconds())

    setInterval(() => {
      void this.queue
        .add(async () => {
          await this.fetchMembers()
        })
        .catch(this.errorHandler.promiseCatch('fetching and adding members'))
    }, ScoresManager.FetchMembersEvery)

    setInterval(() => {
      void this.migrateUsernames().catch(this.errorHandler.promiseCatch('migrating Mojang usernames to UUID'))
    }, Duration.minutes(30).toMilliseconds())
  }

  public getMessages30Days(): TotalMessagesLeaderboard[] {
    const currentDate = Date.now()
    const ignores = this.config.data.minecraftBotUuids
    return this.database.getGuildMessagesLeaderboard(ignores, currentDate - 30 * 24 * 60 * 60 * 1000, currentDate)
  }

  public getMinecraftMessages30Days(limit: number): { top: MessagesLeaderboard[]; total: number } {
    const currentDate = Date.now()
    const ignores = this.config.data.minecraftBotUuids
    return this.database.getMinecraftMessages(ignores, currentDate - 30 * 24 * 60 * 60 * 1000, currentDate, limit)
  }

  public getDiscordMessages30Days(userIds: string[]): MessagesLeaderboard[] {
    const currentDate = Date.now()
    return this.database.getDiscordMessages(userIds, currentDate - 30 * 24 * 60 * 60 * 1000, currentDate)
  }

  public getOnline30Days(): MemberLeaderboard[] {
    const currentDate = Date.now()
    const ignores = this.config.data.minecraftBotUuids
    return this.database.getTime('OnlineMembers', ignores, currentDate - 30 * 24 * 60 * 60 * 1000, currentDate)
  }

  public getPoints30Days(): ActivityTotalPoints[] {
    if (
      this.cachedPoints30Days !== undefined &&
      this.lastUpdatePoints30Days + ScoresManager.ScoresExpireAt.toMilliseconds() > Date.now()
    ) {
      return this.cachedPoints30Days
    }

    const currentDate = Date.now()
    const points = this.database.getPoints(currentDate - Duration.days(30).toMilliseconds(), currentDate)
    const leaderboard = this.normalizePoints(points)

    this.cachedPoints30Days = leaderboard
    this.lastUpdatePoints30Days = Date.now()

    return leaderboard
  }

  public getPointsAlltime(): ActivityTotalPoints[] {
    if (
      this.cachedPointsAlltime !== undefined &&
      this.lastUpdatePointsAlltime + ScoresManager.ScoresExpireAt.toMilliseconds() > Date.now()
    ) {
      return this.cachedPointsAlltime
    }

    const points = this.database.getPoints(0, Date.now())
    const leaderboard = this.normalizePoints(points)

    this.cachedPointsAlltime = leaderboard
    this.lastUpdatePointsAlltime = Date.now()

    return leaderboard
  }

  private normalizePoints(points: Map<string, ActivityTotalPoints>): ActivityTotalPoints[] {
    for (const minecraftBotUuid of this.config.data.minecraftBotUuids) {
      points.delete(minecraftBotUuid)
    }
    for (const minecraftBot of this.application.minecraftManager.getMinecraftBots()) {
      points.delete(minecraftBot.uuid)
    }

    const leaderboard = points.values().toArray()
    for (const currentScore of leaderboard) {
      currentScore.total = Math.floor(currentScore.total)
    }
    leaderboard.sort((a, b) => b.total - a.total)

    return leaderboard
  }

  private addBotUuid(uuid: string): void {
    if (this.config.data.minecraftBotUuids.includes(uuid)) return

    this.config.data.minecraftBotUuids.push(uuid)
    this.config.markDirty()
  }

  private async fetchGuilds(): Promise<void> {
    for (const instance of this.application.minecraftManager.getAllInstances()) {
      const botUuid = instance.uuid()
      if (botUuid === undefined) continue
      this.logger.trace(`Fetching guild members for bot uuid ${botUuid}`)

      const guild = await this.application.hypixelApi.getGuild('player', botUuid)
      if (!guild || guild.isRaw()) return
      const timeframes: Timeframe[] = []
      const currentTimestamp = Date.now()
      for (const member of guild.members) {
        timeframes.push({
          uuid: member.uuid,
          fromTimestamp: member.joinedAtTimestamp ?? 0,
          toTimestamp: currentTimestamp,
          leniencyMilliseconds: this.config.data.leniencyTimeSeconds * 1000
        })
      }
      this.logger.trace(`Supplementing ${timeframes.length} guild members timeframe data for bot uuid ${botUuid}`)
      this.database.addMembers(timeframes)
    }
  }

  private async fetchMembers(): Promise<void> {
    const instances = this.application.minecraftManager.getAllInstances()
    for (const bot of this.application.minecraftManager.getMinecraftBots()) {
      this.addBotUuid(bot.uuid)
    }

    const tasks: Promise<unknown>[] = []

    for (const instance of instances) {
      const botUuid = instance.uuid()
      if (botUuid !== undefined) this.addBotUuid(botUuid)

      if (instance.currentStatus() === Status.Connected) {
        const onlineTask = this.application.core.guildManager
          .list(instance.instanceName)
          .then((guild) => guild.members.filter((member) => member.online).map((member) => member.username))
          .then((usernames) => this.application.mojangApi.profilesByUsername(new Set(usernames)))
          .then((profiles) => {
            const uuids = [...profiles.values()].filter((uuid) => uuid !== undefined)
            const currentTime = Date.now()
            const leniency = this.getLeniency()
            const entries: Timeframe[] = uuids.map((uuid) => ({
              uuid: uuid,
              fromTimestamp: currentTime,
              toTimestamp: currentTime,
              leniencyMilliseconds: leniency
            }))
            this.database.addOnlineMembers(entries)
          })
          .catch(this.errorHandler.promiseCatch('fetching and adding online members'))

        const allTask = this.application.core.guildManager
          .list(instance.instanceName)
          .then((guild) => guild.members.map((member) => member.username))
          .then((usernames) => this.application.mojangApi.profilesByUsername(new Set(usernames)))
          .then((profiles) => {
            const uuids = [...profiles.values()].filter((uuid) => uuid !== undefined)
            const currentTime = Date.now()
            const leniency = this.getLeniency()
            const entries: Timeframe[] = uuids.map((uuid) => ({
              uuid: uuid,
              fromTimestamp: currentTime,
              toTimestamp: currentTime,
              leniencyMilliseconds: leniency
            }))
            this.database.addMembers(entries)
          })
          .catch(this.errorHandler.promiseCatch('fetching and adding all members'))

        tasks.push(onlineTask, allTask)
      }
    }

    await Promise.all(tasks)
  }

  private async migrateUsernames(): Promise<void> {
    /**
     * Only migrate from the last 30 days since Mojang locks username for up to 30 days before releasing it to the public
     * Within 30 days period, there won't be conflict between players UUID
     */
    const oldestTimestamp = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

    const usernames = this.database.getLegacyUsernames(oldestTimestamp)
    if (usernames.size === 0) return
    this.logger.debug(`Found ${usernames.size} legacy username that requires migration`)

    const resolvedProfiles = await this.application.mojangApi.profilesByUsername(usernames)
    const entries: { username: string; uuid: string }[] = []
    for (const [username, uuid] of resolvedProfiles.entries()) {
      if (uuid === undefined) continue
      entries.push({ username, uuid })
    }

    if (entries.length < usernames.size) {
      this.logger.debug(`No Mojang information found for ${usernames.size - entries.length} username. Skipping those.`)
    }

    const changedCount = this.database.migrateUsernameToUuid(oldestTimestamp, entries)
    if (changedCount > 0) {
      this.logger.debug(`Migrated ${changedCount} database entry from Mojang username to UUID`)
    }
  }

  private timestamp(): number {
    const currentTime = Date.now()
    const remaining = currentTime % ScoresManager.InstantInterval
    return currentTime - remaining
  }

  private getLeniency(): number {
    return this.config.data.leniencyTimeSeconds * 1000
  }
}

class ScoreDatabase {
  constructor(
    private readonly scoresManager: ScoresManager,
    private readonly sqliteManager: SqliteManager
  ) {
    sqliteManager.registerCleaner(() => this.clean())
  }

  public addMinecraftCommand(uuid: string, timestamp: number): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "MinecraftCommands" (timestamp, user, count) VALUES (@timestamp, @user, 1) ON CONFLICT DO UPDATE SET count = count + 1'
    )
    const result = insert.run({ user: uuid, timestamp: Math.floor(timestamp / 1000) })
    assert.ok(result.changes > 0, 'Nothing changed even when inserted?')
  }

  public addDiscordCommand(id: string, timestamp: number): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "DiscordCommands" (timestamp, user, count) VALUES (@timestamp, @user, 1) ON CONFLICT DO UPDATE SET count = count + 1'
    )
    const result = insert.run({ user: id, timestamp: Math.floor(timestamp / 1000) })
    assert.ok(result.changes > 0, 'Nothing changed even when inserted?')
  }

  public addMinecraftMessage(uuid: string, timestamp: number): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "MinecraftMessages" (timestamp, user, count) VALUES (@timestamp, @user, 1) ON CONFLICT DO UPDATE SET count = count + 1'
    )
    const result = insert.run({ user: uuid, timestamp: Math.floor(timestamp / 1000) })
    assert.ok(result.changes > 0, 'Nothing changed even when inserted?')
  }

  public getMinecraftMessages(
    ignore: string[],
    from: number,
    to: number,
    limit: number
  ): {
    top: MessagesLeaderboard[]
    total: number
  } {
    let ignoreQuery = ''
    if (ignore.length > 0) ignoreQuery = ` user NOT IN (` + ignore.map(() => '?').join(',') + ') AND'
    const database = this.sqliteManager.getDatabase()

    const select = database.prepare(
      `SELECT user, total(count) as total FROM "MinecraftMessages" WHERE` +
        ignoreQuery +
        ` timestamp BETWEEN ? AND ? GROUP BY user ORDER BY total DESC LIMIT ?`
    )
    const total = database.prepare(
      `SELECT total(count) as total FROM "MinecraftMessages" WHERE` + ignoreQuery + ` timestamp BETWEEN ? AND ?`
    )

    const parameters = [...ignore, Math.floor(from / 1000), Math.floor(to / 1000)]

    const top = select.all(...parameters, limit) as MessagesLeaderboard[]
    return { top: top, total: total.pluck(true).get(...parameters) as number }
  }

  public getDiscordMessages(userIds: string[], from: number, to: number): MessagesLeaderboard[] {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      `SELECT user, total(count) as total FROM "DiscordMessages" WHERE user IN (` +
        userIds.map(() => '?').join(',') +
        `) AND timestamp BETWEEN ? AND ? GROUP BY user ORDER BY total DESC`
    )
    return select.all(...userIds, Math.floor(from / 1000), Math.floor(to / 1000)) as MessagesLeaderboard[]
  }

  public getGuildMessagesLeaderboard(ignore: string[], from: number, to: number): TotalMessagesLeaderboard[] {
    const database = this.sqliteManager.getDatabase()

    const selectMinecraft = database.prepare(
      `SELECT user as uuid, links.discordId, count FROM "MinecraftMessages" LEFT JOIN links ON (MinecraftMessages.user = links.uuid) WHERE MinecraftMessages.user NOT IN (${ignore.map(() => '?').join(',')}) AND timestamp BETWEEN ? AND ?`
    )
    const selectDiscord = database.prepare(
      `SELECT user as discordId, links.uuid, count FROM "DiscordMessages" JOIN links ON (DiscordMessages.user = links.discordId) WHERE links.uuid NOT IN (${ignore.map(() => '?').join(',')}) AND timestamp BETWEEN ? AND ?`
    )

    const parameters = [ignore, Math.floor(from / 1000), Math.floor(to / 1000)]

    const transaction = database.transaction(() => {
      interface DatabaseEntry {
        uuid: string
        count: number
        discordId: string | null
      }

      const leaderboard = new Map<string, TotalMessagesLeaderboard>()

      const minecraftResult = selectMinecraft.all(...parameters) as DatabaseEntry[]
      const discordResult = selectDiscord.all(...parameters) as DatabaseEntry[]
      for (const entry of [...minecraftResult, ...discordResult]) {
        let object: TotalMessagesLeaderboard | undefined = leaderboard.get(entry.uuid)
        if (object === undefined) {
          object = { uuid: entry.uuid, discordId: entry.discordId ?? undefined, count: 0 }
          leaderboard.set(entry.uuid, object)
        }

        object.count += entry.count
      }

      const resultLeaderboard = [...leaderboard.values()]
      resultLeaderboard.sort((a, b) => b.count - a.count)
      return resultLeaderboard
    })

    return transaction()
  }

  public getTime(
    table: 'allMembers' | 'OnlineMembers',
    ignore: string[],
    from: number,
    to: number
  ): MemberLeaderboard[] {
    assert.ok(from < to, '"from" timestamp is earlier than the "to" timestamp')

    let ignoreQuery = ''
    if (ignore.length > 0)
      ignoreQuery = ` ${table}.uuid NOT IN (` + ignore.map((parameter, index) => `@uuid${index}`).join(',') + ') AND'

    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      `SELECT ${table}.uuid, links.discordId, total((min(@toTimestamp, toTimestamp) - max(@fromTimestamp, fromTimestamp))) as totalTime FROM "${table}"` +
        ` LEFT JOIN links ON (${table}.uuid = links.uuid)` +
        ' WHERE' +
        ignoreQuery +
        ' ((fromTimestamp BETWEEN @fromTimestamp AND @toTimestamp) OR (toTimestamp BETWEEN @fromTimestamp AND @toTimestamp))' +
        ` GROUP BY ${table}.uuid ORDER BY totalTime DESC`
    )

    const parameters: Record<string, unknown> = {
      toTimestamp: Math.floor(to / 1000),
      fromTimestamp: Math.floor(from / 1000)
    }
    for (const [index, element] of ignore.entries()) {
      parameters[`uuid${index}`] = element
    }

    const leaderboard = select.all(parameters) as MemberLeaderboard[]
    for (const entry of leaderboard) {
      entry.discordId ??= undefined
    }
    return leaderboard
  }

  public addDiscordMessage(id: string, timestamp: number): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "DiscordMessages" (timestamp, user, count) VALUES (@timestamp, @user, 1) ON CONFLICT DO UPDATE SET count = count + 1'
    )
    const result = insert.run({ user: id, timestamp: Math.floor(timestamp / 1000) })
    assert.ok(result.changes > 0, 'Nothing changed even when inserted?')
  }

  public addOnlineMembers(entries: Timeframe[]): void {
    this.appendTimeframe('OnlineMembers', entries)
  }

  public addMembers(entries: Timeframe[]): void {
    this.appendTimeframe('AllMembers', entries)
  }

  /*
    Consolidate timeframes where from and to timestamps overlap (+ additional leniency when checking for overlapping)
   */
  private appendTimeframe(tableName: string, entries: Timeframe[]): void {
    const database = this.sqliteManager.getDatabase()
    const getTimeframe = database.prepare(
      `SELECT id, fromTimestamp, toTimestamp FROM "${tableName}" WHERE ` +
        `uuid = @uuid` +
        ` AND (` +
        // check nearby timeframes with some leniency
        ` (fromTimestamp > @toTimestamp AND fromTimestamp - @toTimestamp <= @leniency) OR ` +
        ` (toTimestamp < @fromTimestamp AND @fromTimestamp - toTimestamp <= @leniency) OR ` +
        // check overlapping timeframes
        ` (fromTimestamp BETWEEN @fromTimestamp AND @toTimestamp) OR ` +
        ` (toTimestamp BETWEEN @fromTimestamp AND @toTimestamp)` +
        `)`
    )
    const deleteTimeframe = database.prepare(`DELETE FROM "${tableName}" WHERE id = ?`)
    const insertTimeframe = database.prepare(
      `INSERT INTO "${tableName}" (uuid, fromTimestamp, toTimestamp) VALUES (@uuid, @fromTimestamp, @toTimestamp)`
    )

    const transaction = database.transaction(() => {
      for (const entry of entries) {
        const uuid = entry.uuid
        const fromTimestamp = Math.floor(entry.fromTimestamp / 1000)
        const toTimestamp = Math.floor(entry.toTimestamp / 1000)
        const leniencySeconds = Math.floor(entry.leniencyMilliseconds / 1000)

        const existingFrames = getTimeframe.all({
          uuid: uuid,
          fromTimestamp: fromTimestamp,
          toTimestamp: toTimestamp,
          leniency: leniencySeconds
        }) as { id: string; toTimestamp: number; fromTimestamp: number }[]

        if (existingFrames.length > 0) {
          for (const frame of existingFrames) {
            deleteTimeframe.run(frame.id)
          }

          let lowestTime = Math.min(existingFrames[0].fromTimestamp, fromTimestamp)
          let highestTime = Math.max(existingFrames[0].toTimestamp, toTimestamp)
          for (const frame of existingFrames) {
            if (frame.fromTimestamp < lowestTime) lowestTime = frame.fromTimestamp
            if (frame.toTimestamp > highestTime) highestTime = frame.toTimestamp
          }

          insertTimeframe.run({ uuid: uuid, fromTimestamp: lowestTime, toTimestamp: highestTime })
        } else {
          insertTimeframe.run({ uuid: uuid, fromTimestamp: fromTimestamp, toTimestamp: toTimestamp })
        }
      }
    })

    transaction()
  }

  private getMessagesPoints(from: number, to: number): Map<string, ActivityPoint> {
    const database = this.sqliteManager.getDatabase()

    const selectMinecraft = database.prepare(
      `SELECT user as uuid, links.discordId, count, MinecraftMessages.timestamp FROM "MinecraftMessages" LEFT JOIN links ON (MinecraftMessages.user = links.uuid) WHERE timestamp BETWEEN ? AND ?`
    )
    const selectDiscord = database.prepare(
      `SELECT user as discordId, links.uuid, count, DiscordMessages.timestamp FROM "DiscordMessages" JOIN links ON (DiscordMessages.user = links.discordId) WHERE timestamp BETWEEN ? AND ?`
    )

    const transaction = database.transaction(() => {
      const minecraftResult = selectMinecraft.all(
        Math.floor(from / 1000),
        Math.floor(to / 1000)
      ) as DatabaseCountEntry[]
      const discordResult = selectDiscord.all(Math.floor(from / 1000), Math.floor(to / 1000)) as DatabaseCountEntry[]
      const allEntries = [...minecraftResult, ...discordResult]

      const ScoreMaxHistory = Duration.minutes(3)
      const BaseScore = 30

      return this.calculateCount(allEntries, BaseScore, ScoreMaxHistory)
    })

    return transaction()
  }

  private getCommandsPoints(from: number, to: number): Map<string, ActivityPoint> {
    const database = this.sqliteManager.getDatabase()

    const selectMinecraft = database.prepare(
      `SELECT user as uuid, links.discordId, count, MinecraftCommands.timestamp FROM "MinecraftCommands" LEFT JOIN links ON (MinecraftCommands.user = links.uuid) WHERE timestamp BETWEEN ? AND ?`
    )
    const selectDiscord = database.prepare(
      `SELECT user as discordId, links.uuid, count, DiscordCommands.timestamp FROM "DiscordCommands" JOIN links ON (DiscordCommands.user = links.discordId) WHERE timestamp BETWEEN ? AND ?`
    )

    const transaction = database.transaction(() => {
      const minecraftResult = selectMinecraft.all(
        Math.floor(from / 1000),
        Math.floor(to / 1000)
      ) as DatabaseCountEntry[]
      const discordResult = selectDiscord.all(Math.floor(from / 1000), Math.floor(to / 1000)) as DatabaseCountEntry[]
      const allEntries = [...minecraftResult, ...discordResult]

      const ScoreMaxHistory = Duration.minutes(5)
      const BaseScore = 15

      return this.calculateCount(allEntries, BaseScore, ScoreMaxHistory)
    })

    return transaction()
  }

  private calculateCount(
    allEntries: DatabaseCountEntry[],
    baseScore: number,
    scoreMaxHistory: Duration
  ): Map<string, ActivityPoint> {
    allEntries.sort((a, b) => a.timestamp - b.timestamp)

    const leaderboard = new Map<string, ActivityPoint>()
    const countHistory = new Map<string, number[]>()

    for (const entry of allEntries) {
      let activityEntry = leaderboard.get(entry.uuid)
      if (activityEntry === undefined) {
        activityEntry = { uuid: entry.uuid, discordId: entry.discordId ?? undefined, points: 0 }
        leaderboard.set(entry.uuid, activityEntry)
      }
      activityEntry.discordId ??= entry.discordId ?? undefined

      let countHistoryEntry = countHistory.get(entry.uuid)
      if (countHistoryEntry === undefined) {
        countHistoryEntry = []
        countHistory.set(entry.uuid, countHistoryEntry)
      } else {
        countHistoryEntry = countHistoryEntry.filter(
          (countHistory) => countHistory + scoreMaxHistory.toSeconds() > entry.timestamp
        )
        countHistory.set(entry.uuid, countHistoryEntry)
      }

      for (let counter = 0; counter < entry.count; counter++) {
        countHistoryEntry.push(entry.timestamp)

        const pointsIncrement = Math.max(1, baseScore / countHistoryEntry.length)
        activityEntry.points += pointsIncrement
      }
    }

    return leaderboard
  }

  private getOnlinePoints(from: number, to: number): Map<string, ActivityPoint> {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      `SELECT OnlineMembers.uuid, links.discordId, fromTimestamp, toTimestamp FROM "OnlineMembers"` +
        ` LEFT JOIN links ON (OnlineMembers.uuid = links.uuid)` +
        ` WHERE ((fromTimestamp BETWEEN @fromTimestamp AND @toTimestamp) OR (toTimestamp BETWEEN @fromTimestamp AND @toTimestamp))` +
        ` ORDER BY fromTimestamp ASC`
    )

    interface DatabaseTimeframes {
      uuid: string
      discordId: string | undefined
      fromTimestamp: number
      toTimestamp: number
    }

    const timeframes = select.all({
      fromTimestamp: Math.floor(from),
      toTimestamp: Math.floor(to)
    }) as DatabaseTimeframes[]

    const BaseScore = 15
    const ScoreCooldown = Duration.minutes(15).toSeconds()

    const leaderboard = new Map<string, ActivityPoint>()
    const reachedTimestamps = new Map<string, number>()
    for (const entry of timeframes) {
      entry.fromTimestamp = Math.max(entry.fromTimestamp, Math.floor(from / 1000))
      entry.toTimestamp = Math.min(entry.toTimestamp, Math.floor(to / 1000))

      let user = leaderboard.get(entry.uuid)
      if (user === undefined) {
        user = { uuid: entry.uuid, discordId: entry.discordId ?? undefined, points: 0 }
        leaderboard.set(entry.uuid, user)
      }
      user.discordId ??= entry.discordId ?? undefined

      let reachedTimestamp = reachedTimestamps.get(entry.uuid)
      if (entry.toTimestamp < (reachedTimestamp ?? 0)) continue

      if (reachedTimestamp === undefined) {
        reachedTimestamp = entry.fromTimestamp
      } else if (reachedTimestamp < entry.fromTimestamp) {
        if (reachedTimestamp + ScoreCooldown > entry.toTimestamp) {
          continue
        } else {
          reachedTimestamp += ScoreCooldown
        }
      } else {
        reachedTimestamp = Math.max(reachedTimestamp, entry.fromTimestamp)
      }

      for (; reachedTimestamp <= entry.toTimestamp; reachedTimestamp += ScoreCooldown) {
        user.points += BaseScore
      }

      reachedTimestamps.set(entry.uuid, reachedTimestamp)
    }

    return leaderboard
  }

  public getPoints(from: number, to: number): Map<string, ActivityTotalPoints> {
    assert.ok(from < to, '"from" timestamp must be earlier than the "to" timestamp')

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const leaderboard = new Map<string, ActivityTotalPoints>()
      const getUser = (entry: ActivityPoint) => {
        let user = leaderboard.get(entry.uuid)
        if (user === undefined) {
          user = {
            uuid: entry.uuid,
            discordId: entry.discordId ?? undefined,
            total: 0,
            chat: 0,
            online: 0,
            commands: 0
          }
          leaderboard.set(entry.uuid, user)
        }
        user.discordId ??= entry.discordId ?? undefined
        return user
      }

      for (const entry of this.getMessagesPoints(from, to).values()) {
        const user = getUser(entry)
        const points = Math.floor(entry.points)

        user.total += points
        user.chat += points
      }
      for (const entry of this.getCommandsPoints(from, to).values()) {
        const user = getUser(entry)
        const points = Math.floor(entry.points)

        user.total += points
        user.commands += points
      }
      for (const entry of this.getOnlinePoints(from, to).values()) {
        const user = getUser(entry)
        const points = Math.floor(entry.points)

        user.total += points
        user.online += points
      }

      return leaderboard
    })

    return transaction()
  }

  public getLegacyUsernames(oldestTimestamp: number): Set<string> {
    const database = this.sqliteManager.getDatabase()

    const result = new Set<string>()

    const getMinecraftChat = database.prepare(
      'SELECT user FROM MinecraftMessages WHERE timestamp > ? AND length(user) < 30 GROUP BY user'
    )
    for (const username of getMinecraftChat.pluck(true).all(oldestTimestamp)) result.add(username as string)

    return result
  }

  public migrateUsernameToUuid(oldestTimestamp: number, entries: { username: string; uuid: string }[]): number {
    const database = this.sqliteManager.getDatabase()

    const updateMinecraftChat = database.prepare(
      'UPDATE MinecraftMessages SET user = ? WHERE user = ? AND timestamp > ?'
    )

    const transaction = database.transaction(() => {
      let count = 0
      for (const entry of entries) {
        const result = updateMinecraftChat.run(entry.uuid, entry.username, oldestTimestamp)
        count += result.changes
      }

      return count
    })

    return transaction()
  }

  public clean(): number {
    const currentTime = Math.floor(Date.now() / 1000)
    const oldestMessageTimestamp = currentTime - this.scoresManager.config.data.deleteMessagesOlderThan * 24 * 60 * 60
    const oldestMemberTimestamp = currentTime - this.scoresManager.config.data.deleteMembersOlderThan * 24 * 60 * 60

    const database = this.sqliteManager.getDatabase()

    const deleteMinecraftMessages = database.prepare('DELETE FROM "MinecraftMessages" WHERE timestamp < ?')
    const deleteDiscordMessages = database.prepare('DELETE FROM "DiscordMessages" WHERE timestamp < ?')

    const deleteMinecraftCommands = database.prepare('DELETE FROM "MinecraftCommands" WHERE timestamp < ?')
    const deleteDiscordCommands = database.prepare('DELETE FROM "DiscordCommands" WHERE timestamp < ?')

    const deleteAllMembers = database.prepare('DELETE FROM "AllMembers" WHERE toTimestamp < ?')
    const deleteOnlineMembers = database.prepare('DELETE FROM "OnlineMembers" WHERE toTimestamp < ?')

    const transaction = database.transaction(() => {
      let count = 0

      count += deleteMinecraftMessages.run(oldestMessageTimestamp).changes
      count += deleteDiscordMessages.run(oldestMessageTimestamp).changes

      count += deleteMinecraftCommands.run(oldestMessageTimestamp).changes
      count += deleteDiscordCommands.run(oldestMessageTimestamp).changes

      count += deleteAllMembers.run(oldestMemberTimestamp).changes
      count += deleteOnlineMembers.run(oldestMemberTimestamp).changes

      return count
    })

    return transaction()
  }
}

interface Timeframe {
  uuid: string
  fromTimestamp: number
  toTimestamp: number
  leniencyMilliseconds: number
}

interface ScoreManagerConfig {
  deleteMessagesOlderThan: number
  deleteMembersOlderThan: number
  leniencyTimeSeconds: number

  minecraftBotUuids: string[]
}

interface MessagesLeaderboard {
  user: string
  total: number
}

interface TotalMessagesLeaderboard {
  uuid: string
  count: number
  discordId: string | undefined
}

interface MemberLeaderboard {
  uuid: string
  totalTime: number
  discordId: string | undefined
}

interface DatabaseCountEntry {
  uuid: string
  count: number
  discordId: string | null
  timestamp: number
}

export interface ActivityPoint {
  uuid: string
  discordId: string | undefined
  points: number
}

export interface ActivityTotalPoints {
  uuid: string
  discordId: string | undefined

  total: number
  commands: number
  chat: number
  online: number
}
