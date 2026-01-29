import assert from 'node:assert'
import fs from 'node:fs'

import type Database from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../../application'
import type { BasePunishment } from '../../common/application-event'
import { InstanceType, PunishmentPurpose, PunishmentType } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { User, UserIdentifier } from '../../common/user'

export type SavedPunishment = BasePunishment & UserIdentifier & { id: number | bigint }

export default class Punishments {
  public readonly ready: Promise<void>

  constructor(
    private readonly sqliteManager: SqliteManager,
    application: Application,
    logger: Logger
  ) {
    sqliteManager.registerCleaner(() => {
      const database = sqliteManager.getDatabase()
      database.transaction(() => {
        const deleteStatement = database.prepare('DELETE FROM "punishments" WHERE till < ?')
        const result = deleteStatement.run(Math.floor(Date.now() / 1000)).changes
        if (result > 0) logger.debug(`Deleted ${result} entry of expired punishments`)
      })()
    })

    this.ready = Promise.resolve().then(() => this.migrateAnyOldData(application, logger))
  }

  private async migrateAnyOldData(application: Application, logger: Logger): Promise<void> {
    interface OldEntry {
      userName: string
      userUuid?: string
      till: number
      reason: string
    }

    interface OldType {
      mute: OldEntry[]
      ban: OldEntry[]
    }

    async function findIdentifier(entry: OldEntry): Promise<UserIdentifier | undefined> {
      if (entry.userUuid) {
        return { originInstance: InstanceType.Minecraft, userId: entry.userUuid }
      }

      try {
        const mojangProfile = await application.mojangApi.profileByUsername(entry.userName)
        logger.debug(
          `Found a mojang profile to username "${entry.userName}". Migrating the punishment to mojang uuid ${mojangProfile.id}`
        )
        return { originInstance: InstanceType.Minecraft, userId: mojangProfile.id }
      } catch (error: unknown) {
        logger.error(`Failed migrating a legacy punishment entry: ${JSON.stringify(entry)}`)
        logger.warn('Entry will be entirely skipped. Manually re-add the entry if needed.')
        logger.error(error)
        return undefined
      }
    }

    const path = application.getConfigFilePath('punishments.json')
    if (!fs.existsSync(path)) return
    logger.info('Found old punishments file. Migrating this file into the new system...')

    const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as OldType
    const currentTime = Date.now()
    const punishments: Omit<SavedPunishment, 'id'>[] = []
    let total = 0

    for (const entry of oldObject.mute) {
      if (entry.till < currentTime) continue
      total++

      const identifier = await findIdentifier(entry)
      if (identifier == undefined) continue
      punishments.push({
        ...identifier,
        type: PunishmentType.Mute,
        purpose: PunishmentPurpose.Manual,
        till: entry.till,
        reason: entry.reason,
        createdAt: currentTime
      })
    }

    for (const entry of oldObject.ban) {
      if (entry.till < currentTime) continue
      total++

      const identifier = await findIdentifier(entry)
      if (identifier == undefined) continue
      punishments.push({
        ...identifier,
        type: PunishmentType.Ban,
        purpose: PunishmentPurpose.Manual,
        till: entry.till,
        reason: entry.reason,
        createdAt: currentTime
      })
    }

    logger.info(`Successfully parsed ${punishments.length} legacy punishments out of ${total}`)
    this.addEntries(punishments)

    logger.debug('Deleting punishments legacy file...')
    fs.rmSync(path)
  }

  public add(punishment: Omit<SavedPunishment, 'id'>): SavedPunishment {
    return this.addEntries([punishment])[0]
  }

  private addEntries(punishments: Omit<SavedPunishment, 'id'>[]): SavedPunishment[] {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "punishments" (originInstance, userId, type, purpose, reason, createdAt, till) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )

    const transaction = database.transaction(() => {
      const result: SavedPunishment[] = []

      for (const punishment of punishments) {
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
        result.push(selectResult)
      }

      return result
    })

    return transaction()
  }

  public remove(user: User): SavedPunishment[] {
    const currentTime = Date.now()

    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      const foundEntries = this.getPunishments(database, user.allIdentifiers(), currentTime)
      if (foundEntries.length === 0) return []

      let deleteQuery = `DELETE FROM "punishments" WHERE id IN (`
      deleteQuery += foundEntries.map(() => '?').join(', ')
      deleteQuery += ')'

      const parameters = foundEntries.map((entry) => entry.id)

      const deletedEntries = database.prepare(deleteQuery).run(...parameters).changes
      assert.strictEqual(foundEntries.length, deletedEntries)

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

  findByUser(user: User): SavedPunishment[] {
    const current = Date.now()
    const result = this.getPunishments(this.sqliteManager.getDatabase(), user.allIdentifiers(), current)
    return this.convertDatabaseFields(result)
  }

  all(): SavedPunishment[] {
    const current = Date.now()
    const result = this.getPunishments(this.sqliteManager.getDatabase(), [], current)
    return this.convertDatabaseFields(result)
  }

  /*
   * Get all punishments if no identifiers set, otherwise, get the user punishments with the supplied identifiers
   */
  private getPunishments(
    database: Database.Database,
    identifiers: UserIdentifier[],
    currentTime: number
  ): SavedPunishment[] {
    let query = 'SELECT * FROM "punishments" WHERE '
    const parameters: unknown[] = []

    if (identifiers.length > 0) {
      query += '('
      for (let index = 0; index < identifiers.length; index++) {
        const identifier = identifiers[index]

        parameters.push(identifier.originInstance)
        parameters.push(identifier.userId)

        query += `(originInstance = ? AND userId = ?)`
        if (index !== identifiers.length - 1) query += ' OR '
      }
      query += ') AND '
    }

    query += 'till > ?'
    parameters.push(Math.floor(currentTime / 1000))

    const get = database.prepare(query)
    return get.all(...parameters) as SavedPunishment[]
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
    return punishment
  }
}
