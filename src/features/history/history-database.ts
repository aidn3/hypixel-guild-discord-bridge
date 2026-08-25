import assert from 'node:assert'

import type { Logger } from 'log4js'

import type {
  ChannelType,
  GuildGeneralEventType,
  GuildPlayerEventType,
  Platform,
  UserId
} from '../../common/application-event.js'
import type { SqliteManager } from '../../common/sqlite-manager.js'
import type { AnonymousUser } from '../../common/user.js'
import type { Users } from '../../core/users.js'
import Duration from '../../utility/duration.js'

export class HistoryDatabase {
  private static readonly MaxHistory = Duration.years(3)

  public constructor(
    private readonly sqlManager: SqliteManager,
    private readonly users: Users,
    logger: Logger
  ) {
    this.sqlManager.registerCleaner(() => {
      const database = this.sqlManager.getDatabase()

      const transaction = database.transaction(() => {
        const oldestAt = Math.floor(Date.now() / 1000) - HistoryDatabase.MaxHistory.toSeconds()
        const chat = database.prepare<[number]>('DELETE FROM "historyChat" WHERE createdAt < ?').run(oldestAt).changes
        const guildPlayerActivity = database
          .prepare<[number]>('DELETE FROM "historyGuildPlayerActivity" WHERE createdAt < ?')
          .run(oldestAt).changes
        const guildGeneralActivity = database
          .prepare<[number]>('DELETE FROM "historyGuildGeneralActivity" WHERE createdAt < ?')
          .run(oldestAt).changes

        return { chat, guildPlayerActivity, guildGeneralActivity }
      })

      const result = transaction()
      if (result.chat > 0) {
        logger.debug(`Deleted ${result.chat} chat history entry`)
      }
      if (result.guildPlayerActivity > 0) {
        logger.debug(`Deleted ${result.guildPlayerActivity} guildPlayerActivity history entry`)
      }
      if (result.guildGeneralActivity > 0) {
        logger.debug(`Deleted ${result.guildGeneralActivity} chat history entry`)
      }
    })
  }

  public addChat(entry: HistoryChat): void {
    const database = this.sqlManager.getDatabase()

    const transaction = database.transaction(() => {
      database
        .prepare(`INSERT INTO historyChat (userId, message, channelType, platform, createdAt) VALUES (?, ?, ?, ?, ?)`)
        .run(entry.userId, entry.message, entry.channelType, entry.platform, Math.floor(entry.createdAt / 1000))
    })

    transaction()
  }

  public addGuildPlayerActivity(entry: HistoryGuildPlayerActivity): void {
    const database = this.sqlManager.getDatabase()

    const transaction = database.transaction(() => {
      database
        .prepare(
          `INSERT INTO historyGuildPlayerActivity (userId, responsibleUserId, type, message, createdAt) VALUES (?, ?, ?, ?, ?)`
        )
        .run(entry.userId, entry.responsibleUserId, entry.type, entry.message, Math.floor(entry.createdAt / 1000))
    })

    transaction()
  }

  public addGuildGeneralActivity(entry: HistoryGuildGeneralActivity): void {
    const database = this.sqlManager.getDatabase()

    const transaction = database.transaction(() => {
      database
        .prepare(`INSERT INTO historyGuildGeneralActivity (type, message, createdAt) VALUES (?, ?, ?)`)
        .run(entry.type, entry.message, Math.floor(entry.createdAt / 1000))
    })

    transaction()
  }

  public addCommandResponse(entry: HistoryCommandResponse): void {
    const database = this.sqlManager.getDatabase()

    const transaction = database.transaction(() => {
      database
        .prepare(
          `INSERT INTO historyCommandResponse (userId, channelType, platform, message, createdAt)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(entry.userId, entry.channelType, entry.platform, entry.message, Math.floor(entry.createdAt / 1000))
    })

    transaction()
  }

  public addCommandFeedback(entry: HistoryCommandFeedback): void {
    const database = this.sqlManager.getDatabase()

    const transaction = database.transaction(() => {
      database
        .prepare(
          `INSERT INTO historyCommandFeedback (userId, channelType, platform, message, createdAt)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(entry.userId, entry.channelType, entry.platform, entry.message, Math.floor(entry.createdAt / 1000))
    })

    transaction()
  }

  public all(): HistoryEntry[] {
    const database = this.sqlManager.getDatabase()

    const transaction = database.transaction(() => {
      const chat = database
        .prepare<[], HistoryChat>(`SELECT *, '${HistoryType.Chat}' AS historyType FROM "historyChat" `)
        .all()

      const commandResponse = database
        .prepare<[], HistoryCommandResponse>(
          `SELECT *, '${HistoryType.CommandResponse}' AS historyType FROM "historyCommandResponse" `
        )
        .all()

      const commandFeedback = database
        .prepare<[], HistoryCommandFeedback>(
          `SELECT *, '${HistoryType.CommandFeedback}' AS historyType FROM "historyCommandFeedback" `
        )
        .all()

      const guildPlayerActivity = database
        .prepare<[], HistoryGuildPlayerActivity>(
          `SELECT *, '${HistoryType.GuildPlayerActivity}' AS historyType FROM "historyGuildPlayerActivity"`
        )
        .all()

      const guildGeneralActivity = database
        .prepare<[], HistoryChat>(
          `SELECT *, '${HistoryType.GuildGeneralActivity}' AS historyType FROM "historyGuildGeneralActivity"`
        )
        .all()

      return [...chat, ...commandResponse, ...commandFeedback, ...guildPlayerActivity, ...guildGeneralActivity]
    })

    return transaction()
  }

  public byUser(user: AnonymousUser): HistoryEntry[] {
    const userIds = this.users.resolveAllUserId(user)
    assert.notStrictEqual(userIds.length, 0)

    const parameters = '(' + userIds.map(() => '?').join(', ') + ')'

    const database = this.sqlManager.getDatabase()
    const transaction = database.transaction(() => {
      const chat = database
        .prepare<[...UserId[]], HistoryChat>(
          `SELECT *, '${HistoryType.Chat}' AS historyType FROM "historyChat" WHERE userId IN ${parameters}`
        )
        .all(...userIds)

      const commandResponse = database
        .prepare<[...UserId[]], HistoryCommandResponse>(
          `SELECT *, '${HistoryType.CommandResponse}' AS historyType
           FROM "historyCommandResponse"
           WHERE userId IN ${parameters}`
        )
        .all(...userIds)
      const commandFeedback = database
        .prepare<[...UserId[]], HistoryCommandFeedback>(
          `SELECT *, '${HistoryType.CommandFeedback}' AS historyType
           FROM "historyCommandFeedback"
           WHERE userId IN ${parameters}`
        )
        .all(...userIds)

      const guildPlayerActivity = database
        .prepare<[...UserId[]], HistoryGuildPlayerActivity>(
          `SELECT *, '${HistoryType.GuildPlayerActivity}' AS historyType FROM "historyGuildPlayerActivity" WHERE userId IN ${parameters} OR responsibleUserId IN ${parameters}`
        )
        .all(...userIds, ...userIds)

      const allTimestamps = [
        ...chat.map((entry) => entry.createdAt),
        ...guildPlayerActivity.map((entry) => entry.createdAt)
      ]
      const oldestTimestamp = Math.min(...allTimestamps)
      const earliestTimestamp = Math.max(...allTimestamps)
      const guildGeneralActivity = database
        .prepare<[number, number], HistoryChat>(
          `SELECT *, '${HistoryType.GuildGeneralActivity}' AS historyType FROM "historyGuildGeneralActivity" WHERE createdAt > ? AND createdAt < ?`
        )
        .all(oldestTimestamp, earliestTimestamp)

      return [...chat, ...commandResponse, ...commandFeedback, ...guildPlayerActivity, ...guildGeneralActivity]
    })

    return transaction()
  }
}

export type HistoryEntry =
  | HistoryChat
  | HistoryGuildPlayerActivity
  | HistoryGuildGeneralActivity
  | HistoryCommandResponse
  | HistoryCommandFeedback

export interface HistoryChat {
  historyType: HistoryType.Chat

  userId: UserId
  message: string
  channelType: ChannelType
  platform: Platform
  createdAt: number
}

export interface HistoryGuildPlayerActivity {
  historyType: HistoryType.GuildPlayerActivity

  userId: UserId | undefined
  responsibleUserId: UserId | undefined
  type: GuildPlayerEventType
  message: string
  createdAt: number
}

export interface HistoryGuildGeneralActivity {
  historyType: HistoryType.GuildGeneralActivity

  type: GuildGeneralEventType
  message: string
  createdAt: number
}

export interface HistoryCommandResponse {
  historyType: HistoryType.CommandResponse

  channelType: ChannelType
  platform: Platform
  createdAt: number

  userId: UserId
  message: string
}

export interface HistoryCommandFeedback {
  historyType: HistoryType.CommandFeedback

  channelType: ChannelType
  platform: Platform
  createdAt: number

  userId: UserId
  message: string
}

export enum HistoryType {
  Chat = 'chat',
  GuildPlayerActivity = 'guildPlayerActivity',
  GuildGeneralActivity = 'guildGeneralActivity',
  CommandResponse = 'commandResponse',
  CommandFeedback = 'commandFeedback'
}
