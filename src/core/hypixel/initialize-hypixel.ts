import type { Database } from 'better-sqlite3'

import type { SqliteManager } from '../../common/sqlite-manager'

export function initializeHypixelDatabase(sqliteManager: SqliteManager, name: string): void {
  sqliteManager.registerMigrator((database) => {
    migrateFrom0to1(database)
  })

  sqliteManager.migrate(name)
}

function migrateFrom0to1(database: Database): void {
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
}
