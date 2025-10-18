import assert from 'node:assert'
import fs from 'node:fs'

import Database from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../application.js'

export class SqliteManager {
  private static readonly CleanEvery = 3 * 60 * 60 * 1000

  private readonly configFilePath: string
  private readonly database: Database.Database

  private readonly registeredTables = new Set<string>()
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

    this.database = new Database(filepath)
    this.database.pragma('journal_mode = WAL')
  }

  public register(name: string, query: string): void {
    assert.ok(!this.registeredTables.has(name.toLowerCase()), `name already registered: ${name}`)

    this.getDatabase().exec(query)
    this.registeredTables.add(name)
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

    const transaction = database.transaction(() => {
      let finished = false
      let changed = false
      while (!finished) {
        const currentVersion = database.pragma('user_version', { simple: true }) as number
        const migrator = this.migrators.get(currentVersion)
        if (migrator !== undefined) {
          migrator(database, this.logger)
          changed = true
          continue
        }

        assert.strictEqual(
          currentVersion,
          this.targetVersion,
          'migration process failed to reach the target version somehow??'
        )
        if (changed) {
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

  private tryClean(): void {
    const currentTime = Date.now()

    if (this.lastClean + SqliteManager.CleanEvery > currentTime) return
    this.lastClean = currentTime
    for (const cleanCallback of this.cleanCallbacks) {
      cleanCallback()
    }
  }
}

export type Migrator = (database: Database.Database, logger: Logger) => void
