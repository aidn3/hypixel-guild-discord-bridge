import assert from 'node:assert'

import type { UserId } from '../common/application-event'
import type { SqliteManager } from '../common/sqlite-manager'
import type { AnonymousUser, UserIdentifier } from '../common/user'

export class Users {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public resolveAllUserId(user: AnonymousUser): UserId[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      return user.allIdentifiers().map((identifier) => this.resolveUserId(identifier))
    })
    return transaction()
  }

  public resolveUserId(user: UserIdentifier): UserId {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const getId = database.prepare<[UserIdentifier['userId'], UserIdentifier['originInstance']], UserId>(
        'SELECT id FROM users WHERE userId = ? AND originInstance = ?'
      )
      const savedResult = getId.pluck(true).get(user.userId, user.originInstance)
      if (savedResult !== undefined) return savedResult

      const insert = database.prepare<[UserIdentifier['userId'], UserIdentifier['originInstance']]>(
        'INSERT INTO "users" (userId, originInstance) VALUES (?, ?)'
      )
      const insertResult = insert.run(user.userId, user.originInstance)
      assert.strictEqual(insertResult.changes, 1)

      return insertResult.lastInsertRowid
    })

    return transaction()
  }

  public getUserIdentifier(id: UserId): UserIdentifier | undefined {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const getId = database.prepare<[UserId], UserIdentifier>('SELECT userId, originInstance FROM users WHERE id = ?')
      return getId.get(id)
    })

    return transaction()
  }
}
