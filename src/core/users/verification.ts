import assert from 'node:assert'

import type { UserId, UserLink } from '../../common/application-event.js'
import { Platform } from '../../common/application-event.js'
import type { SqliteManager } from '../../common/sqlite-manager.js'
import type { Users } from '../users.js'

export class Verification {
  private readonly database: VerificationDatabase

  constructor(
    sqliteManager: SqliteManager,
    private readonly users: Users
  ) {
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

  /**
   * Find and merge entries of users from different platforms into a single entry.
   *
   * @param entries raw entries representing each user-platform with its entry value
   * @param merge a callback function to handle merging entries of the same user type
   *
   * @returns a map containing one user (randomly selected from all platforms)
   *   with the value being the merged one from all platforms for that user
   */
  public async linkEntries<T>(entries: Map<UserId, T>, merge: (entries: T[]) => T): Promise<Map<UserId, T>> {
    const result = new Map<UserId, T>()
    const checkedUser = new Set<UserId>()
    function addOrMerge(userId: UserId, value: T) {
      const existingValue = result.get(userId)
      const newValue = existingValue === undefined ? value : merge([existingValue, value])
      result.set(userId, newValue)
    }

    for (const [userId, value] of entries.entries()) {
      if (checkedUser.has(userId)) continue
      checkedUser.add(userId)
      addOrMerge(userId, value)

      const identifier = this.users.getUserIdentifier(userId)
      if (identifier === undefined) continue

      switch (identifier.originInstance) {
        case Platform.Minecraft: {
          const link = await this.findByIngame(identifier.userId)
          if (link === undefined) continue

          const discordId = this.users.resolveUserId({ originInstance: Platform.Discord, userId: link.discordId })
          const discordValue = entries.get(discordId)
          if (discordValue !== undefined) {
            checkedUser.add(discordId)
            addOrMerge(userId, discordValue)
          }
          break
        }

        case Platform.Discord: {
          const link = await this.findByDiscord(identifier.userId)
          if (link === undefined) continue

          const mojangId = this.users.resolveUserId({ originInstance: Platform.Minecraft, userId: link.uuid })
          const mojangValue = entries.get(mojangId)
          if (mojangValue !== undefined) {
            checkedUser.add(mojangId)
            addOrMerge(userId, mojangValue)
          }
          break
        }

        case Platform.Unknown: {
          // do nothing
          break
        }

        default: {
          identifier.originInstance satisfies never
          assert.fail(`unknown identifier ${JSON.stringify(identifier)}`)
        }
      }
    }

    return result
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
