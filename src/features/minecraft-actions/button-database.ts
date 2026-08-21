import assert from 'node:assert'

import type { SqliteManager } from '../../common/sqlite-manager.js'

export class ButtonDatabase {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public add(entry: DiscordPersistentInstance): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare(
        'INSERT INTO "discordMinecraftActionButtons" (messageId, channelId, type, botUuid, userUuid, command, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )

      const result = insert.run(
        entry.messageId,
        entry.channelId,
        entry.type,
        entry.botUuid,
        entry.userUuid,
        entry.command,
        Math.floor(entry.expiresAt / 1000),
        Math.floor(entry.createdAt / 1000)
      )
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }

  public getButton(messageId: string): DiscordPersistentInstance | undefined {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const select = database.prepare<[string], DiscordPersistentInstance>(
        'SELECT * FROM "discordMinecraftActionButtons" WHERE messageId = ?'
      )
      const result = select.get(messageId)
      if (result === undefined) return

      result.expiresAt *= 1000
      result.createdAt *= 1000
      return result
    })

    return transaction()
  }

  public getExpiredButtons(): DiscordPersistentInstance[] {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const select = database.prepare<[], DiscordPersistentInstance>(
        'SELECT * FROM "discordMinecraftActionButtons" WHERE expiresAt < (unixepoch())'
      )

      const result = select.all()
      for (const entry of result) {
        entry.expiresAt *= 1000
        entry.createdAt *= 1000
      }

      return result
    })

    return transaction()
  }

  public removeMessages(messagesIds: string[]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('DELETE FROM "discordMinecraftActionButtons" WHERE messageId = ?')

      let count = 0
      for (const entry of messagesIds) {
        count += update.run(entry).changes
      }

      return count
    })

    return transaction()
  }

  public removeChannels(channelsIds: string[]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('DELETE FROM "discordMinecraftActionButtons" WHERE channelId = ?')

      let count = 0
      for (const entry of channelsIds) {
        count += update.run(entry).changes
      }

      return count
    })

    return transaction()
  }
}

export interface DiscordPersistentInstance {
  messageId: string
  channelId: string
  type: DiscordInstanceHistoryButtonType

  botUuid: string
  userUuid: string | undefined
  command: string

  expiresAt: number
  createdAt: number
}

export enum DiscordInstanceHistoryButtonType {
  RequestToJoinGuild = 'RequestToJoinGuild',
  InvitedToGuild = 'InvitedToGuild'
}
