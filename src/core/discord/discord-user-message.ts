import assert from 'node:assert'

import type { UserId } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { AnonymousUser, UserIdentifier } from '../../common/user'
import type { Users } from '../users'

export class DiscordUserMessage {
  constructor(
    private readonly sqliteManager: SqliteManager,
    private readonly users: Users
  ) {}

  public add(messageId: string, user: AnonymousUser): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const userId = this.users.resolveUserId(user.getUserIdentifier())
      const insert = database.prepare<[typeof messageId, UserId]>(
        'INSERT INTO "discordMessageSender" (messageId, userId) VALUES (?, ?)'
      )

      const result = insert.run(messageId, userId)
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }

  public getUserIdentifier(messageId: string): UserIdentifier | undefined {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const userId = database
        .prepare<[string], UserId>('SELECT userId FROM "discordMessageSender" WHERE messageId = ?')
        .pluck(true)
        .get(messageId)

      if (userId === undefined) return

      const identifier = this.users.getUserIdentifier(userId)
      assert.ok(identifier !== undefined)
      return identifier
    })

    return transaction()
  }

  public remove(messagesIds: string[]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('DELETE FROM "discordMessageSender" WHERE messageId = ?')

      let count = 0
      for (const entry of messagesIds) {
        count += update.run(entry).changes
      }

      return count
    })

    return transaction()
  }
}
