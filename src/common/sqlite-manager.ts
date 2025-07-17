import assert from 'node:assert'

import { default as Database } from 'better-sqlite3'

import type Application from '../application.js'

export class SqliteManager {
  private static readonly CleanEvery = 3 * 60 * 60 * 1000

  private readonly configFilePath: string
  private readonly database: Database.Database

  private readonly registeredTables = new Set<string>()
  private closed = false

  private lastClean = -1
  private cleanCallbacks: (() => void)[] = []

  public constructor(application: Application, filepath: string) {
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
    assert(!this.registeredTables.has(name.toLowerCase()), `name already registered: ${name}`)

    this.getDatabase().exec(query)
    this.registeredTables.add(name)
  }

  public registerCleaner(callback: () => void): void {
    this.cleanCallbacks.push(callback)
  }

  public close(): void {
    this.closed = true
    this.database.close()
  }

  public isClosed(): boolean {
    return this.closed
  }

  public getDatabase(): Database.Database {
    assert(!this.isClosed(), 'Database is closed')
    this.tryClean()
    return this.database
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
