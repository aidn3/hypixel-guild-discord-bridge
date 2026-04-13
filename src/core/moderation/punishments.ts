import assert from 'node:assert'

import type Database from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../../application'
import type { BasePunishment } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { User, UserIdentifier } from '../../common/user'

export type SavedPunishment = BasePunishment & UserIdentifier & SavedPunishmentMetadata
interface SavedPunishmentMetadata {
  id: number | bigint
  /**
   * timestamp when the punishment was forgiven. Otherwise, set to `-1`.
   *
   * @default -1
   */
  forgiven: number
  expired: boolean
}

export default class Punishments {
  constructor(
    private readonly sqliteManager: SqliteManager,
    application: Application,
    logger: Logger
  ) {
    sqliteManager.registerCleaner(() => {
      const database = sqliteManager.getDatabase()
      database.transaction(() => {
        const setExpired = database.prepare(
          'UPDATE "punishments" SET expired = 1 WHERE expired != 0 AND till < (unixepoch())'
        )
        const result = setExpired.run().changes
        if (result > 0) logger.debug(`Set expired status to ${result} punishments`)
      })()
    })
  }

  public add(punishment: Omit<SavedPunishment, keyof SavedPunishmentMetadata>): SavedPunishment {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "punishments" (originInstance, userId, type, purpose, reason, createdAt, till) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )

    const transaction = database.transaction(() => {
      const insertResult = insert.run(
        punishment.originInstance,
        punishment.userId,
        punishment.type,
        punishment.purpose,
        punishment.reason,
        Math.floor(punishment.createdAt / 1000),
        Math.floor(punishment.till / 1000)
      )

      const selectResult = this.get(insertResult.lastInsertRowid)
      assert.ok(selectResult !== undefined)

      return selectResult
    })

    return transaction()
  }

  public forgive(user: User): SavedPunishment[] {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const foundEntries = this.getPunishments(database, user.allIdentifiers(), true, -1, -1).page
      if (foundEntries.length === 0) return []

      let forgivenQuery = `UPDATE "punishments" SET forgiven = (unixepoch()) WHERE id IN (`
      forgivenQuery += foundEntries.map(() => '?').join(', ')
      forgivenQuery += ')'

      const parameters = foundEntries.map((entry) => entry.id)

      const updateResult = database.prepare(forgivenQuery).run(...parameters).changes
      assert.strictEqual(foundEntries.length, updateResult)

      return this.convertDatabaseFields(foundEntries)
    })

    return transaction()
  }

  public get(id: SavedPunishment['id']): SavedPunishment | undefined {
    const database = this.sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      const select = database.prepare<[SavedPunishment['id']], SavedPunishment>(
        'SELECT * FROM "punishments" WHERE id = ?'
      )
      const result = select.get(id)
      return this.convertDatabaseEntry(result)
    })

    return transaction()
  }

  public edit(
    id: SavedPunishment['id'],
    reason: BasePunishment['reason'] | undefined,
    till: BasePunishment['till'] | undefined
  ): SavedPunishment | undefined {
    assert.ok(reason !== undefined || till !== undefined, 'Need to provide a field to edit!')

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      if (reason !== undefined) {
        const edit = database.prepare<[typeof reason, typeof id], SavedPunishment>(
          'UPDATE "punishments" SET reason = ? WHERE id = ?'
        )
        const editResult = edit.run(reason, id)
        if (editResult.changes === 0) return
      }
      if (till !== undefined) {
        const edit = database.prepare<[typeof till, typeof id], SavedPunishment>(
          'UPDATE "punishments" SET till = ? WHERE id = ?'
        )
        const editResult = edit.run(Math.floor(till / 1000), id)
        if (editResult.changes === 0) return
      }

      const result = this.get(id)
      assert.ok(result !== undefined)
      return result
    })

    return transaction()
  }

  findByUser(
    user: User,
    onlyActive: boolean,
    offset: number,
    limit: number
  ): { page: SavedPunishment[]; total: number } {
    const result = this.getPunishments(
      this.sqliteManager.getDatabase(),
      user.allIdentifiers(),
      onlyActive,
      offset,
      limit
    )
    return { total: result.total, page: this.convertDatabaseFields(result.page) }
  }

  all(onlyActive: boolean, offset: number, limit: number): { page: SavedPunishment[]; total: number } {
    const result = this.getPunishments(this.sqliteManager.getDatabase(), [], onlyActive, offset, limit)
    return { total: result.total, page: this.convertDatabaseFields(result.page) }
  }

  /*
   * Get all punishments if no identifiers set, otherwise, get the user punishments with the supplied identifiers
   */
  private getPunishments(
    database: Database.Database,
    identifiers: UserIdentifier[],
    onlyActive: boolean,
    offset: number,
    limit: number
  ): { page: SavedPunishment[]; total: number } {
    let query = 'SELECT *, COUNT(*) OVER() AS totalCount FROM "punishments" WHERE 1=1'
    const parameters: unknown[] = []

    if (onlyActive) query += ' AND forgiven = -1'
    if (onlyActive) query += ' AND expired = 0 AND till > (unixepoch())'

    if (identifiers.length > 0) {
      query += ' AND ('
      for (let index = 0; index < identifiers.length; index++) {
        const identifier = identifiers[index]

        parameters.push(identifier.originInstance)
        parameters.push(identifier.userId)

        query += `(originInstance = ? AND userId = ?)`
        if (index !== identifiers.length - 1) query += ' OR '
      }
      query += ')'
    }

    query += ' ORDER BY till DESC'
    query += ` LIMIT ${limit} OFFSET ${offset};`

    const get = database.prepare<[...unknown[]], SavedPunishment & { totalCount: number }>(query)
    const result = get.all(...parameters)
    return { total: result.at(0)?.totalCount ?? 0, page: result }
  }

  private convertDatabaseFields(punishments: SavedPunishment[]): SavedPunishment[] {
    for (const entry of punishments) {
      this.convertDatabaseEntry(entry)
    }
    return punishments
  }

  private convertDatabaseEntry(punishment: Writeable<SavedPunishment> | undefined): SavedPunishment | undefined {
    if (punishment === undefined) return undefined

    punishment.createdAt = punishment.createdAt * 1000
    punishment.till = punishment.till * 1000
    punishment.forgiven = punishment.forgiven * 1000
    if ('totalCount' in punishment) delete punishment.totalCount // from #getPunishments()

    return punishment
  }
}
