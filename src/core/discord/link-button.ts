import assert from 'node:assert'

import type { SqliteManager } from '../../common/sqlite-manager'

export class DiscordLinkButton {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public add(messageId: string): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const insert = database.prepare('INSERT OR REPLACE INTO "discordLinkButton" (messageId) VALUES (?)')

      const result = insert.run(messageId)
      assert.strictEqual(result.changes, 1)
    })

    transaction()
  }

  public getButton(messageId: string): boolean {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const select = database.prepare('SELECT messageId FROM "discordLinkButton" WHERE messageId = ? LIMIT 1')
      return select.all(messageId).length > 0
    })

    return transaction()
  }

  public remove(messagesIds: string[]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('DELETE FROM "discordLinkButton" WHERE messageId = ?')

      let count = 0
      for (const entry of messagesIds) {
        count += update.run(entry).changes
      }

      return count
    })

    return transaction()
  }
}
