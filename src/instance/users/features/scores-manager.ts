import assert from 'node:assert'

import type { Logger } from 'log4js'
import PromiseQueue from 'promise-queue'

import type Application from '../../../application.js'
import { InstanceType } from '../../../common/application-event.js'
import { ConfigManager } from '../../../common/config-manager.js'
import { Status } from '../../../common/connectable-instance.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type { SqliteManager } from '../../../common/sqlite-manager.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type UsersManager from '../users-manager.js'

export default class ScoresManager extends EventHandler<UsersManager, InstanceType.Util, void> {
  private static readonly DeleteMemberOlderThan = 30
  private static readonly DeleteMessagesOlderThan = 356
  private static readonly LeniencyTimeSeconds = 5 * 60

  static readonly InstantInterval = 60 * 1000
  private static readonly FetchMembersEvery = 50 * 1000

  private readonly queue = new PromiseQueue(1)
  readonly config: ConfigManager<ScoreManagerConfig>
  private readonly database: ScoreDatabase

  constructor(
    application: Application,
    clientInstance: UsersManager,
    eventHelper: EventHelper<InstanceType.Util>,
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
      switch (event.instanceType) {
        case InstanceType.Discord: {
          this.database.addDiscordMessage(event.userId, this.timestamp())
          break
        }
        case InstanceType.Minecraft: {
          void this.queue
            .add(async () => {
              const profile = await this.application.mojangApi.profileByUsername(event.username)
              this.database.addMinecraftMessage(profile.id, this.timestamp())
            })
            .catch(this.errorHandler.promiseCatch('adding minecraft chat message score'))
        }
      }
    })

    setInterval(() => {
      void this.queue
        .add(async () => {
          await this.fetchMembers()
        })
        .catch(this.errorHandler.promiseCatch('fetching and adding members'))
    }, ScoresManager.FetchMembersEvery)
  }

  public getMessages30Days(limit: number): { top: MessagesLeaderboard[]; total: number } {
    const currentDate = Date.now()
    const ignores = this.config.data.minecraftBotUuids
    return this.database.getMinecraftMessages(ignores, currentDate - 30 * 24 * 60 * 60 * 1000, currentDate, limit)
  }

  public getDiscordMessages30Days(userIds: string[]): MessagesLeaderboard[] {
    const currentDate = Date.now()
    return this.database.getDiscordMessages(userIds, currentDate - 30 * 24 * 60 * 60 * 1000, currentDate)
  }

  public getOnline30Days(limit: number): { top: MemberLeaderboard[]; total: number } {
    const currentDate = Date.now()
    const ignores = this.config.data.minecraftBotUuids
    return this.database.getTime('OnlineMembers', ignores, currentDate - 30 * 24 * 60 * 60 * 1000, currentDate, limit)
  }

  private addBotUuid(uuid: string): void {
    if (this.config.data.minecraftBotUuids.includes(uuid)) return

    this.config.data.minecraftBotUuids.push(uuid)
    this.config.markDirty()
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
        const onlineTask = this.application.usersManager.guildManager
          .onlineMembers(instance.instanceName)
          .then((entries) => entries.flatMap((entry) => [...entry.usernames]))
          .then((usernames) => this.application.mojangApi.profilesByUsername(new Set(usernames)))
          .then((profiles) => {
            const uuids = [...profiles.values()].filter((uuid) => uuid !== undefined)
            const currentTime = Date.now()
            const leniency = this.getLeniency()
            const entries: Timeframe[] = uuids.map((uuid) => ({
              uuid: uuid,
              timestamp: currentTime,
              toTimestamp: currentTime,
              leniencyMilliseconds: leniency
            }))
            this.database.addOnlineMembers(entries)
          })
          .catch(this.errorHandler.promiseCatch('fetching and adding online members'))

        const allTask = this.application.usersManager.guildManager
          .listMembers(instance.instanceName)
          .then((entries) => entries.flatMap((entry) => [...entry.usernames]))
          .then((usernames) => this.application.mojangApi.profilesByUsername(new Set(usernames)))
          .then((profiles) => {
            const uuids = [...profiles.values()].filter((uuid) => uuid !== undefined)
            const currentTime = Date.now()
            const leniency = this.getLeniency()
            const entries: Timeframe[] = uuids.map((uuid) => ({
              uuid: uuid,
              timestamp: currentTime,
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
    sqliteManager.register(
      'DiscordMessages',
      "CREATE TABLE IF NOT EXISTS 'DiscordMessages' (" +
        '  timestamp INTEGER NOT NULL,' +
        '  user TEXT NOT NULL,' +
        '  count INTEGER NOT NULL DEFAULT 0,' +
        '  PRIMARY KEY(timestamp, user)' +
        ')'
    )
    sqliteManager.register(
      'MinecraftMessages',
      "CREATE TABLE IF NOT EXISTS 'MinecraftMessages' (" +
        '  timestamp INTEGER NOT NULL,' +
        '  user TEXT NOT NULL,' +
        '  count INTEGER NOT NULL DEFAULT 0,' +
        '  PRIMARY KEY(timestamp, user)' +
        ')'
    )

    sqliteManager.register(
      'AllMembers',
      "CREATE TABLE IF NOT EXISTS 'AllMembers' (" +
        '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
        '  uuid TEXT NOT NULL,' +
        "  fromDate TEXT NOT NULL GENERATED ALWAYS AS (date(fromTimestamp, 'unixepoch')) STORED, " +
        '  fromTimestamp INTEGER NOT NULL,' +
        "  toDate TEXT NOT NULL GENERATED ALWAYS AS (date(toTimestamp, 'unixepoch')) STORED, " +
        '  toTimestamp INTEGER NOT NULL,' +
        '  CONSTRAINT "timeRange" CHECK(fromTimestamp <= toTimestamp)' +
        ' )'
    )
    sqliteManager.register(
      'AllMembers',
      "CREATE TABLE IF NOT EXISTS 'OnlineMembers' (" +
        '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
        '  uuid TEXT NOT NULL,' +
        "  fromDate TEXT NOT NULL GENERATED ALWAYS AS (date(fromTimestamp ,'unixepoch')) STORED, " +
        '  fromTimestamp INTEGER NOT NULL,' +
        "  toDate TEXT NOT NULL GENERATED ALWAYS AS (date(toTimestamp, 'unixepoch')) STORED, " +
        '  toTimestamp INTEGER NOT NULL,' +
        '  CONSTRAINT "timeRange" CHECK(fromTimestamp <= toTimestamp)' +
        ' );'
    )

    sqliteManager.register(
      'allMembersAppend',
      'CREATE INDEX IF NOT EXISTS allMembersAppend ON "AllMembers" (uuid, fromDate, toDate);'
    )
    sqliteManager.register(
      'onlineMembersAppend',
      'CREATE INDEX IF NOT EXISTS onlineMembersAppend ON "OnlineMembers" (uuid, fromDate, toDate);'
    )

    sqliteManager.registerCleaner(() => this.clean())
  }

  public addMinecraftMessage(uuid: string, timestamp: number): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "MinecraftMessages" (timestamp, user, count) VALUES (@timestamp, @user, 1) ON CONFLICT DO UPDATE SET count = count + 1'
    )
    const result = insert.run({ user: uuid, timestamp: Math.floor(timestamp / 1000) })
    assert(result.changes > 0, 'Nothing changed even when inserted?')
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

  public getTime(
    table: 'allMembers' | 'OnlineMembers',
    ignore: string[],
    from: number,
    to: number,
    limit: number
  ): {
    top: MemberLeaderboard[]
    total: number
  } {
    assert(from < to, '"from" timestamp is earlier than the "to" timestamp')

    let ignoreQuery = ''
    if (ignore.length > 0)
      ignoreQuery = ` uuid NOT IN (` + ignore.map((parameter, index) => `@uuid${index}`).join(',') + ') AND'

    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      `SELECT uuid, total((min(@toTimestamp, toTimestamp) - max(@fromTimestamp, fromTimestamp))) as totalTime FROM "${table}"` +
        ' WHERE' +
        ignoreQuery +
        ' ((fromTimestamp BETWEEN @fromTimestamp AND @toTimestamp) OR (toTimestamp BETWEEN @fromTimestamp AND @toTimestamp))' +
        ' GROUP BY uuid ORDER BY totalTime DESC LIMIT @limit'
    )
    const total = database.prepare(
      `SELECT total((min(@toTimestamp, toTimestamp) - max(@fromTimestamp, fromTimestamp))) as totalTime FROM "${table}"` +
        ' WHERE' +
        ignoreQuery +
        ' ((fromTimestamp BETWEEN @fromTimestamp AND @toTimestamp) OR (toTimestamp BETWEEN @fromTimestamp AND @toTimestamp))'
    )

    const parameters: Record<string, unknown> = {
      toTimestamp: Math.floor(to / 1000),
      fromTimestamp: Math.floor(from / 1000),
      limit: limit
    }
    for (const [index, element] of ignore.entries()) {
      parameters[`uuid${index}`] = element
    }

    return {
      top: select.all(parameters) as MemberLeaderboard[],
      total: total.pluck(true).get(parameters) as number
    }
  }

  public addDiscordMessage(id: string, timestamp: number): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "DiscordMessages" (timestamp, user, count) VALUES (@timestamp, @user, 1) ON CONFLICT DO UPDATE SET count = count + 1'
    )
    const result = insert.run({ user: id, timestamp: Math.floor(timestamp / 1000) })
    assert(result.changes > 0, 'Nothing changed even when inserted?')
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
        ` (fromTimestamp > @timestamp AND fromTimestamp - @timestamp <= @leniency) OR ` +
        ` (toTimestamp < @timestamp AND @timestamp - toTimestamp <= @leniency)` +
        `)`
    )
    const deleteTimeframe = database.prepare(`DELETE FROM "${tableName}" WHERE id = ?`)
    const insertTimeframe = database.prepare(
      `INSERT INTO "${tableName}" (uuid, fromTimestamp, toTimestamp) VALUES (@uuid, @fromTimestamp, @toTimestamp)`
    )

    const transaction = database.transaction(() => {
      for (const entry of entries) {
        const uuid = entry.uuid
        const timestamp = Math.floor(entry.timestamp / 1000)
        const leniencySeconds = Math.floor(entry.leniencyMilliseconds / 1000)

        const existingFrames = getTimeframe.all({
          uuid: uuid,
          timestamp: timestamp,
          leniency: leniencySeconds
        }) as { id: string; toTimestamp: number; fromTimestamp: number }[]

        if (existingFrames.length > 0) {
          for (const frame of existingFrames) {
            deleteTimeframe.run(frame.id)
          }

          let lowestTime = Math.min(existingFrames[0].fromTimestamp, timestamp)
          let highestTime = Math.max(existingFrames[0].toTimestamp, timestamp)
          for (const frame of existingFrames) {
            if (frame.fromTimestamp < lowestTime) lowestTime = frame.fromTimestamp
            if (frame.toTimestamp > highestTime) highestTime = frame.toTimestamp
          }

          insertTimeframe.run({ uuid: uuid, fromTimestamp: lowestTime, toTimestamp: highestTime })
        } else {
          insertTimeframe.run({ uuid: uuid, fromTimestamp: timestamp, toTimestamp: timestamp })
        }
      }
    })

    transaction()
  }

  public clean(): number {
    const currentTime = Math.floor(Date.now() / 1000)
    const oldestMessageTimestamp = currentTime - this.scoresManager.config.data.deleteMessagesOlderThan * 24 * 60 * 60
    const oldestMemberTimestamp = currentTime - this.scoresManager.config.data.deleteMembersOlderThan * 24 * 60 * 60

    const database = this.sqliteManager.getDatabase()

    const deleteMinecraft = database.prepare('DELETE FROM "MinecraftMessages" WHERE timestamp < ?')
    const deleteDiscord = database.prepare('DELETE FROM "DiscordMessages" WHERE timestamp < ?')

    const deleteAllMembers = database.prepare('DELETE FROM "AllMembers" WHERE toTimestamp < ?')
    const deleteOnlineMembers = database.prepare('DELETE FROM "OnlineMembers" WHERE toTimestamp < ?')

    const transaction = database.transaction(() => {
      let count = 0

      count += deleteMinecraft.run(oldestMessageTimestamp).changes
      count += deleteDiscord.run(oldestMessageTimestamp).changes

      count += deleteAllMembers.run(oldestMemberTimestamp).changes
      count += deleteOnlineMembers.run(oldestMemberTimestamp).changes

      return count
    })

    return transaction()
  }
}

interface Timeframe {
  uuid: string
  timestamp: number
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

interface MemberLeaderboard {
  uuid: string
  totalTime: number
}
