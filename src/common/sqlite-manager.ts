import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import type { SQLInputValue, StatementSync } from 'node:sqlite'
import { DatabaseSync as Database } from 'node:sqlite'

import type { Logger } from 'log4js'

import type Application from '../application.js'
// eslint-disable-next-line import/no-restricted-paths
import Duration from '../utility/duration.js'

export class SqliteManager {
  private static readonly CleanEvery = Duration.hours(3)

  private readonly configFilePath: string | undefined
  private readonly database: Database
  private readonly compatibilityLayer: TypedDatabase
  private readonly newlyCreated: boolean

  private closed = false

  private cleanCallbacks: (() => void)[] = []
  private cleanInterval: NodeJS.Timeout

  private readonly migrators: Migrator[] = []

  public constructor(
    private readonly application: Application,
    private readonly logger: Logger,
    filepath: string | undefined
  ) {
    this.configFilePath = filepath

    if (this.configFilePath === undefined) {
      this.newlyCreated = true
      this.database = new Database(':memory:')
    } else {
      application.addShutdownListener(() => {
        this.close()
      })

      this.newlyCreated = !fs.existsSync(this.configFilePath)

      this.database = new Database(this.configFilePath)
      this.database.exec('pragma journal_mode = WAL')
      this.database.exec('pragma foreign_keys = ON')
    }

    this.compatibilityLayer = new TypedDatabase(this.database)

    this.cleanInterval = setInterval(() => {
      this.clean()
    }, SqliteManager.CleanEvery.toMilliseconds())
  }

  public isNewlyCreated(): boolean {
    return this.newlyCreated
  }

  public registerCleaner(callback: () => void): void {
    this.cleanCallbacks.push(callback)
  }

  public registerMigrator(migrate: Migrator): this {
    this.migrators.push(migrate)

    return this
  }

  public migrate(sqliteName: string): void {
    const database = this.getDatabase()
    const postCleanupActions: (() => void)[] = []

    const logger = this.logger
    /**
     * Perform integrity checks between destructive actions
     * @param type Whether to do a full or a quick check
     */
    function integrityCheck(type: 'quick' | 'full') {
      logger.trace(`Performing ${type} database integrity check`)

      const integrityCheck = database
        .prepare<[], string>(type === 'quick' ? 'pragma quick_check' : 'pragma integrity_check')
        .pluck(true)
        .get()
      assert.strictEqual(integrityCheck, 'ok', 'Database integrity has been violated?')

      const foreignKeyCheck = database.prepare('pragma foreign_key').all()
      if (foreignKeyCheck.length > 0) throw new ForeignKeyViolation(foreignKeyCheck)
    }

    const transaction = database.transaction(() => {
      const newlyCreated = this.isNewlyCreated()

      let currentVersion = database.prepare<[], number>('pragma user_version').pluck(true).get() ?? 0
      if (!newlyCreated) integrityCheck('full')

      let finished = false
      let changed = false
      while (!finished) {
        const migrator = this.migrators.at(currentVersion)
        if (migrator !== undefined) {
          const newVersion = currentVersion + 1

          this.logger.debug(`Migrating database from version ${currentVersion} to ${newVersion}`)
          migrator(database, this.logger, postCleanupActions, newlyCreated)

          integrityCheck('quick')
          database.exec(`pragma user_version = ${newVersion}`)
          currentVersion = newVersion
          changed = true
          continue
        }

        assert.strictEqual(
          currentVersion,
          this.migrators.length,
          `migration process failed to reach the target version somehow?? current=${currentVersion},target=${this.migrators.length}`
        )

        integrityCheck('full')
        if (changed && !newlyCreated) {
          const backupPath = this.application.getBackupPath(sqliteName)
          this.logger.debug(`Backing up old database before committing changes. backup path: ${backupPath}`)
          this.backup(backupPath)
        }

        this.logger.info('Database schema is on latest version')
        finished = true
      }
    })

    transaction()
    if (postCleanupActions.length > 0) {
      this.logger.debug('Starting cleaning up...')

      for (const postAction of postCleanupActions) {
        postAction()
      }

      this.logger.debug('Finished all cleanups.')
    }
  }

  public close(): void {
    this.closed = true
    clearInterval(this.cleanInterval)
    this.database.close()
  }

  public isClosed(): boolean {
    return this.closed
  }

  public getDatabase(): TypedDatabase {
    assert.ok(!this.isClosed(), 'Database is closed')
    return this.compatibilityLayer
  }

  public backup(destination: string): void {
    assert.ok(this.configFilePath !== undefined, 'Can not backup since the database in memory only')
    assert.ok(fs.existsSync(this.configFilePath))
    assert.ok(fs.statSync(this.configFilePath).isFile())

    const snapshot = new Database(this.configFilePath, { readOnly: true })
    snapshot.prepare(`VACUUM INTO ?`).run(path.normalize(destination))
    snapshot.close()

    assert.ok(fs.statSync(destination).isFile(), 'database backup file has not been written??')
  }

  public clean(): void {
    assert.ok(!this.isClosed(), 'Database is closed')

    const startTime = Date.now()
    this.logger.debug('Started cleaning up the database.')

    for (const cleanCallback of this.cleanCallbacks) {
      cleanCallback()
    }

    this.logger.debug(`Finished cleaning up the database. Time took: ${Date.now() - startTime}ms`)
  }

  public optimize(): void {
    assert.ok(!this.isClosed(), 'Database is closed')

    const startTime = Date.now()
    this.logger.debug('re-organizing and optimizing database...')

    this.database.exec('VACUUM')
    this.logger.debug(`Finished optimizing the database. Time took: ${Date.now() - startTime}ms`)
  }
}

export type Migrator = (
  database: TypedDatabase,
  logger: Logger,
  postCleanupActions: (() => void)[],
  newlyCreated: boolean
) => void

export class ForeignKeyViolation extends Error {
  constructor(public readonly violations: unknown[]) {
    super('Database foreign key integrity check failed')
  }
}

/* eslint-disable @typescript-eslint/naming-convention */
export class TypedDatabase {
  constructor(private readonly database: Database) {}

  public prepare<Parameters extends [...unknown[]] = [...unknown[]], Result = unknown>(
    query: string
  ): TypedStatement<Parameters, Result> {
    const statement = this.database.prepare(query)
    return new TypedStatement<Parameters, Result>(statement)
  }
  public exec(query: string): void {
    this.database.exec(query)
  }

  public transaction<T>(callback: () => T): () => T {
    return () => {
      const SavepointName = 'database_savepoint'
      const database = this.database

      let startedTransaction = false
      try {
        if (database.isTransaction) {
          database.exec(`SAVEPOINT ${SavepointName}`)
        } else {
          database.exec('BEGIN TRANSACTION')
          startedTransaction = true
        }

        const result = callback()

        if (startedTransaction) {
          database.exec('COMMIT TRANSACTION')
        } else {
          database.exec(`RELEASE SAVEPOINT ${SavepointName}`)
        }

        return result
      } catch (error: unknown) {
        if (startedTransaction) {
          database.exec('ROLLBACK TRANSACTION')
        } else {
          database.exec(`ROLLBACK TO ${SavepointName}`)
        }

        throw error
      }
    }
  }
}

export class TypedStatement<Parameters extends [...unknown[]], Result> {
  private pluckEnabled = false
  constructor(private readonly statement: StatementSync) {}

  public pluck(enabled: boolean): this {
    this.pluckEnabled = enabled
    return this
  }

  public run(...parameters: Parameters): TypedStatementResultingChanges {
    const result = this.statement.run(...(parameters as SQLInputValue[]))
    return { changes: result.changes as number, lastInsertRowid: result.lastInsertRowid }
  }

  public get(...parameters: Parameters): Result | undefined {
    const result = this.statement.get(...(parameters as SQLInputValue[]))
    if (result === undefined) return undefined

    if (this.pluckEnabled) return Object.values(result).at(0) as Result
    return result as Result
  }
  public all(...parameters: Parameters): Result[] {
    const result = this.statement.all(...(parameters as SQLInputValue[]))

    if (this.pluckEnabled) return result.map((row) => Object.values(row).at(0) as Result)
    return result as Result[]
  }
}

interface TypedStatementResultingChanges {
  changes: number
  lastInsertRowid: number | bigint
}
/* eslint-enable @typescript-eslint/naming-convention */
