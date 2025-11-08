import type { SqliteManager } from '../../common/sqlite-manager'

export class DiscordLeaderboards {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public getAll(): LeaderboardEntry[] {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT * FROM "discordLeaderboards"')

    const entries = select.all() as LeaderboardEntry[]
    for (const entry of entries) {
      entry.guildId = entry.guildId ?? undefined // convert null to undefined
      entry.updatedAt = entry.updatedAt * 1000
      entry.createdAt = entry.createdAt * 1000
    }

    return entries
  }

  public addOrSet(entry: LeaderboardEntry): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT OR REPLACE INTO "discordLeaderboards" (messageId, type,channelId, guildId) VALUES (?, ?, ?, ?)'
    )
    insert.run(entry.messageId, entry.type, entry.channelId, entry.guildId)
  }

  public updateTime(entries: { messageId: string; updatedAt: number }[]): void {
    const database = this.sqliteManager.getDatabase()
    database.transaction(() => {
      const update = database.prepare('UPDATE "discordLeaderboards" SET updatedAt = ? WHERE messageId = ?')
      for (const entry of entries) {
        update.run(Math.floor(entry.updatedAt / 1000), entry.messageId)
      }
    })()
  }

  public remove(messagesIds: string[]): number {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const update = database.prepare('DELETE FROM "discordLeaderboards" WHERE messageId = ?')

      let count = 0
      for (const entry of messagesIds) {
        count += update.run(entry).changes
      }

      return count
    })

    return transaction()
  }
}

export interface LeaderboardEntry {
  messageId: string
  type: 'messages30Days' | 'online30Days' | 'points30Days'

  channelId: string
  guildId: string | undefined

  updatedAt: number
  createdAt: number
}
