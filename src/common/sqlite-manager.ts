import assert from 'node:assert'
import fs from 'node:fs'

import Database from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../application.js'
// eslint-disable-next-line import/no-restricted-paths
import Duration from '../utility/duration'

export class SqliteManager {
  private static readonly CleanEvery = Duration.hours(3)

  private readonly configFilePath: string
  private readonly database: Database.Database
  private readonly newlyCreated: boolean

  private closed = false

  private cleanCallbacks: (() => void)[] = []
  private cleanInterval: NodeJS.Timeout

  private readonly migrators = new Map<number, Migrator>()
  private targetVersion = 0

  public constructor(
    private readonly application: Application,
    private readonly logger: Logger,
    filepath: string
  ) {
    this.configFilePath = filepath

    application.applicationIntegrity.addConfigPath(this.configFilePath)
    // temp files
    application.applicationIntegrity.addConfigPath(this.configFilePath + '-shm')
    application.applicationIntegrity.addConfigPath(this.configFilePath + '-wal')

    application.addShutdownListener(() => {
      this.close()
    })

    this.newlyCreated = !fs.existsSync(filepath)

    this.database = new Database(filepath)
    this.database.pragma('journal_mode = WAL')
    this.database.pragma('foreign_keys = ON')

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

  public registerMigrator(version: number, migrate: Migrator): this {
    assert.ok(!this.migrators.has(version), `migration process for version ${version} already registered.`)
    this.migrators.set(version, migrate)

    return this
  }

  public setTargetVersion(version: number): this {
    this.targetVersion = version

    return this
  }

  public migrate(sqliteName: string): void {
    const database = this.getDatabase()
    const postCleanupActions: (() => void)[] = []

    const transaction = database.transaction(() => {
      const newlyCreated = this.isNewlyCreated()

      let finished = false
      let changed = false
      while (!finished) {
        const currentVersion = database.pragma('user_version', { simple: true }) as number
        const migrator = this.migrators.get(currentVersion)
        if (migrator !== undefined) {
          migrator(database, this.logger, postCleanupActions, newlyCreated)
          changed = true
          continue
        }

        assert.strictEqual(
          currentVersion,
          this.targetVersion,
          'migration process failed to reach the target version somehow??'
        )
        if (changed && !newlyCreated) {
          const backupPath = this.application.getBackupPath(sqliteName)
          this.application.applicationIntegrity.addConfigPath(backupPath)
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

  public getDatabase(): Database.Database {
    assert.ok(!this.isClosed(), 'Database is closed')
    return this.database
  }

  public backup(destination: string): void {
    fs.copyFileSync(this.configFilePath, destination)
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
  database: Database.Database,
  logger: Logger,
  postCleanupActions: (() => void)[],
  newlyCreated: boolean
) => void
