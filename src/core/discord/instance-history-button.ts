import assert from 'node:assert'

import type { Logger } from 'log4js'

import type { InstanceIdentifier } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'
import Duration from '../../utility/duration'

export class InstanceHistoryButton {
  private static readonly MaxLife = Duration.years(2)

  constructor(
    private readonly sqliteManager: SqliteManager,
    logger: Logger
  ) {
    this.sqliteManager.registerCleaner(() => {
      const database = this.sqliteManager.getDatabase()
      const transaction = database.transaction(() => {
        const currentTime = Math.floor(Date.now() / 1000)
        const statement = database.prepare('DELETE FROM "discordInstanceHistoryButton" WHERE createdAt < ?')
        return statement.run(currentTime - InstanceHistoryButton.MaxLife.toSeconds()).changes
      })

      const count = transaction()
      if (count > 0) {
        logger.debug(`Deleted ${count} old entries in DiscordPersistentButtons.`)
      }
    })
  }

  public add(entry: DiscordPersistentInstance): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "discordInstanceHistoryButton" (messageId, channelId, instanceName, instanceType, type, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      const updateLastButton = database.prepare(
        'INSERT OR REPLACE INTO "discordInstanceHistoryLastButton" (messageId, channelId, instanceName, createdAt) VALUES (?, ?, ?, ?)'
      )

      const result = insert.run(
        entry.messageId,
        entry.channelId,
        entry.instanceName,
        entry.instanceType,
        entry.type,
        Math.floor(entry.startTime / 1000),
        Math.floor(entry.endTime / 1000)
      )
      assert.strictEqual(result.changes, 1)

      const updateResult = updateLastButton.run(
        entry.messageId,
        entry.channelId,
        entry.instanceName,
        Math.floor(entry.endTime / 1000)
      )
      assert.strictEqual(updateResult.changes, 1)
    })

    transaction()
  }

  public getButton(messageId: string): DiscordPersistentInstance | undefined {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const select = database.prepare('SELECT * FROM "discordInstanceHistoryButton" WHERE messageId = ?')
      const result = select.get(messageId) as DiscordPersistentInstance | undefined

      if (result !== undefined) {
        result.startTime = result.startTime * 1000
        result.endTime = result.endTime * 1000
      }

      return result
    })

    return transaction()
  }

  public lastButton(channelId: string, instanceName: string): DiscordPersistentInstance | undefined {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const findLastMessage = database.prepare(
        'SELECT messageId FROM "discordInstanceHistoryLastButton" WHERE channelId = ? AND instanceName = ?'
      )
      const selectLastMessage = database.prepare('SELECT * FROM "discordInstanceHistoryButton" WHERE messageId = ?')

      const lastMessageId = findLastMessage.pluck(true).get(channelId, instanceName) as string | undefined
      if (!lastMessageId) return

      const result = selectLastMessage.get(lastMessageId) as DiscordPersistentInstance | undefined

      if (result !== undefined) {
        result.startTime = result.startTime * 1000
        result.endTime = result.endTime * 1000
      }

      return result
    })

    return transaction()
  }

  public extendButtonEndTimestamp(messageId: string, endTimestamp: number): void {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const update = database.prepare('UPDATE "discordInstanceHistoryButton" SET endTime = ? WHERE messageId = ?')
      const result = update.run(Math.floor(endTimestamp / 1000), messageId)
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }

  public remove(messagesIds: string[]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('DELETE FROM "discordInstanceHistoryButton" WHERE messageId = ?')

      let count = 0
      for (const entry of messagesIds) {
        count += update.run(entry).changes
      }

      return count
    })

    return transaction()
  }
}

export interface DiscordPersistentInstance extends InstanceIdentifier {
  messageId: string
  channelId: string

  type: DiscordInstanceHistoryButtonType

  startTime: number
  endTime: number
}

export enum DiscordInstanceHistoryButtonType {
  Failed = 'failed',
  Success = 'success',
  Notice = 'notice'
}
