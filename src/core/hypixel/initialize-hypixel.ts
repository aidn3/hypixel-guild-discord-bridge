import type { Database } from 'better-sqlite3'
import type { Logger as Logger4Js } from 'log4js'

import type { SqliteManager } from '../../common/sqlite-manager'

const CurrentVersion = 1

export function initializeHypixelDatabase(sqliteManager: SqliteManager, name: string): void {
  sqliteManager.setTargetVersion(CurrentVersion)

  sqliteManager.registerMigrator(0, (database, logger, postCleanupActions, newlyCreated) => {
    migrateFrom0to1(database, logger, newlyCreated)
  })

  sqliteManager.migrate(name)
}

function migrateFrom0to1(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) logger.debug('Migrating database from version 0 to 1')

  // reference: hypixel/hypixel-database.ts
  database.exec(
    'CREATE TABLE "hypixelApiRequest" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  responseId INTEGER NOT NULL REFERENCES hypixelApiResponse(id) ON DELETE CASCADE,' +
      '  path TEXT NOT NULL,' +
      '  key TEXT NOT NULL,' +
      '  value TEXT NOT NULL,' +
      '  UNIQUE(path, key, value)' +
      ' ) STRICT'
  )
  database.exec(
    'CREATE TABLE "hypixelApiResponse" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  content TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL,' +
      '  lastAccessAt INTEGER NOT NULL' +
      ' ) STRICT'
  )

  database.pragma('user_version = 1')
}
