import assert from 'node:assert'
import fs from 'node:fs'

import type Database from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../../application'
import type { BasePunishment } from '../../common/application-event'
import { InstanceType, PunishmentType } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { User, UserIdentifier } from '../../common/user'

export type SavedPunishment = BasePunishment & UserIdentifier

type DatabasePunishment = SavedPunishment & { id: number }

export default class Punishments {
  public readonly ready: Promise<void>

  constructor(
    private readonly sqliteManager: SqliteManager,
    application: Application,
    logger: Logger
  ) {
    sqliteManager.register(
      'punishments',
      'CREATE TABLE IF NOT EXISTS "punishments" (' +
        '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
        '  originInstance TEXT NOT NULL,' +
        '  userId TEXT NOT NULL,' +
        '  type TEXT NOT NULL,' +
        '  reason TEXT NOT NULL,' +
        '  createdAt INTEGER NOT NULL,' +
        '  till INTEGER NOT NULL' +
        ' )'
    )

    sqliteManager.register(
      'punishmentsIndex',
      'CREATE INDEX IF NOT EXISTS punishmentsIndex ON "punishments" (originInstance, userId);'
    )

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
    const punishments: SavedPunishment[] = []
    let total = 0

    for (const entry of oldObject.mute) {
      if (entry.till < currentTime) continue
      total++

      const identifier = await findIdentifier(entry)
      if (identifier == undefined) continue
      punishments.push({
        ...identifier,
        type: PunishmentType.Mute,
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

  public add(punishment: SavedPunishment): void {
    this.addEntries([punishment])
  }

  private addEntries(punishments: SavedPunishment[]): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT INTO "punishments" (originInstance, userId, type, reason, createdAt, till) VALUES (?, ?, ?, ?, ?, ?)'
    )

    const transaction = database.transaction(() => {
      for (const punishment of punishments) {
        insert.run(
          punishment.originInstance,
          punishment.userId,
          punishment.type,
          punishment.reason,
          Math.floor(punishment.createdAt / 1000),
          Math.floor(punishment.till / 1000)
        )
      }
    })

    transaction()
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
  ): DatabasePunishment[] {
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
    return get.all(...parameters) as (SavedPunishment & { id: number })[]
  }

  private convertDatabaseFields(entries: Writeable<DatabasePunishment>[]): SavedPunishment[] {
    const result: (SavedPunishment & { id?: number })[] = entries

    for (const entry of result) {
      delete entry.id

      const writeableEntry = entry as Writeable<SavedPunishment>
      writeableEntry.createdAt = entry.createdAt * 1000
      writeableEntry.till = entry.till * 1000
    }

    return result as SavedPunishment[]
  }
}
