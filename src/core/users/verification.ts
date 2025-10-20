import type { UserLink } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'

export class Verification {
  private readonly database: VerificationDatabase

  constructor(sqliteManager: SqliteManager) {
    this.database = new VerificationDatabase(sqliteManager)
  }

  public findByDiscord(discordId: string): Awaitable<UserLink | undefined> {
    return this.database.getLinkByDiscord(discordId)
  }

  public findByIngame(uuid: string): Awaitable<UserLink | undefined> {
    return this.database.getLinkByUuid(uuid)
  }

  public addConfirmedLink(discordId: string, uuid: string): void {
    this.database.addLink(discordId, uuid)
  }

  public invalidate(options: { discordId?: string; uuid?: string }): number {
    let count = 0
    if (options.uuid !== undefined) count += this.database.invalidateUuid(options.uuid)
    if (options.discordId !== undefined) count += this.database.invalidateDiscord(options.discordId)
    return count
  }
}

class VerificationDatabase {
  constructor(private readonly sqliteManager: SqliteManager) {}

  public addLink(discordId: string, uuid: string): void {
    const database = this.sqliteManager.getDatabase()
    const deleteOldLinks = database.prepare('DELETE FROM "links" WHERE uuid = ? OR discordId = ?')
    const insert = database.prepare('INSERT INTO "links" (uuid, discordId) VALUES (?, ?)')

    const transaction = database.transaction(() => {
      deleteOldLinks.run(uuid, discordId)
      insert.run(uuid, discordId)
    })

    transaction()
  }

  public getLinkByUuid(uuid: string): UserLink | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT uuid, discordId FROM "links" WHERE uuid = ? LIMIT 1')
    return select.get(uuid) as UserLink | undefined
  }

  public getLinkByDiscord(discordId: string): UserLink | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT uuid, discordId FROM "links" WHERE discordId = ? LIMIT 1')
    return select.get(discordId) as UserLink | undefined
  }

  public invalidateUuid(uuid: string): number {
    const database = this.sqliteManager.getDatabase()

    const deleteOldLinks = database.prepare('DELETE FROM "links" WHERE uuid = ?')

    const transaction = database.transaction(() => {
      return deleteOldLinks.run(uuid).changes
    })

    return transaction()
  }

  public invalidateDiscord(discordId: string): number {
    const database = this.sqliteManager.getDatabase()

    const deleteOldLinks = database.prepare('DELETE FROM "links" WHERE discordId = ?')

    const transaction = database.transaction(() => {
      return deleteOldLinks.run(discordId).changes
    })

    return transaction()
  }
}
