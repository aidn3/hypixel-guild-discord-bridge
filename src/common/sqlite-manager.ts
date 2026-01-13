import assert from 'node:assert'
import fs from 'node:fs'

import Database from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../application.js'

export class SqliteManager {
  private static readonly CleanEvery = 3 * 60 * 60 * 1000

  private readonly configFilePath: string
  private readonly database: Database.Database
  private readonly newlyCreated: boolean

  private closed = false

  private lastClean = -1
  private cleanCallbacks: (() => void)[] = []

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
    this.database.close()
  }

  public isClosed(): boolean {
    return this.closed
  }

  public getDatabase(): Database.Database {
    assert.ok(!this.isClosed(), 'Database is closed')
    this.tryClean()
    return this.database
  }

  public backup(destination: string): void {
    fs.copyFileSync(this.configFilePath, destination)
  }
  public clean(): void {
    for (const cleanCallback of this.cleanCallbacks) {
      cleanCallback()
    }

    this.lastClean = Date.now()
  }

  private tryClean(): void {
    const currentTime = Date.now()

    if (this.lastClean + SqliteManager.CleanEvery > currentTime) return
    this.clean()
  }
}

export type Migrator = (
  database: Database.Database,
  logger: Logger,
  postCleanupActions: (() => void)[],
  newlyCreated: boolean
) => void
