import type { SqliteManager } from '../../common/sqlite-manager'

export interface InactivityEntry {
  uuid: string
  discordId: string
  reason: string
  createdAt: number
  expiresAt: number
}

export class Inactivity {
  private readonly database: InactivityDatabase

  constructor(sqliteManager: SqliteManager) {
    this.database = new InactivityDatabase(sqliteManager)
  }

  public getActiveByUuid(uuid: string): InactivityEntry | undefined {
    return this.database.getActiveByUuid(uuid, nowSeconds())
  }

  public getActiveByDiscordId(discordId: string): InactivityEntry | undefined {
    return this.database.getActiveByDiscordId(discordId, nowSeconds())
  }

  public getAllActive(): InactivityEntry[] {
    return this.database.getAllActive(nowSeconds())
  }

  public add(entry: Omit<InactivityEntry, 'createdAt'>): void {
    this.database.add({ ...entry, createdAt: nowSeconds() })
  }

  public removeByUuid(uuid: string): number {
    return this.database.removeByUuid(uuid)
  }

  public purgeExpired(): number {
    return this.database.purgeExpired(nowSeconds())
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

class InactivityDatabase {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public getActiveByUuid(uuid: string, now: number): InactivityEntry | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT * FROM "inactivity" WHERE uuid = ? AND expiresAt > ? LIMIT 1')
    return select.get(uuid, now) as InactivityEntry | undefined
  }

  public getActiveByDiscordId(discordId: string, now: number): InactivityEntry | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT * FROM "inactivity" WHERE discordId = ? AND expiresAt > ? LIMIT 1')
    return select.get(discordId, now) as InactivityEntry | undefined
  }

  public getAllActive(now: number): InactivityEntry[] {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT * FROM "inactivity" WHERE expiresAt > ?')
    return select.all(now) as InactivityEntry[]
  }

  public add(entry: InactivityEntry): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT OR REPLACE INTO "inactivity" (uuid, discordId, reason, createdAt, expiresAt) VALUES (?, ?, ?, ?, ?)'
    )
    insert.run(entry.uuid, entry.discordId, entry.reason, entry.createdAt, entry.expiresAt)
  }

  public removeByUuid(uuid: string): number {
    const database = this.sqliteManager.getDatabase()
    const remove = database.prepare('DELETE FROM "inactivity" WHERE uuid = ?')
    return remove.run(uuid).changes
  }

  public purgeExpired(now: number): number {
    const database = this.sqliteManager.getDatabase()
    const remove = database.prepare('DELETE FROM "inactivity" WHERE expiresAt <= ?')
    return remove.run(now).changes
  }
}
