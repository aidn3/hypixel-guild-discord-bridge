import type { Database } from 'better-sqlite3'
import type { Logger as Logger4Js } from 'log4js'

import type { SqliteManager } from '../common/sqlite-manager'

const CurrentVersion = 2

export function initializeCoreDatabase(sqliteManager: SqliteManager, name: string): void {
  sqliteManager.setTargetVersion(CurrentVersion)

  sqliteManager.registerMigrator(0, (database, logger, newlyCreated) => {
    migrateFrom0to1(database, logger, newlyCreated)
  })
  sqliteManager.registerMigrator(1, (database, logger, newlyCreated) => {
    migrateFrom1to2(database, logger, newlyCreated)
  })

  sqliteManager.migrate(name)
}

function migrateFrom0to1(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) {
    const checkedIfFresh = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    const existingTable = checkedIfFresh.pluck(true).get('OnlineMembers')
    if (existingTable) {
      logger.debug('Migrating database from version 0 to 1')

      // Check git commit: 9495ee42a6f50542d18938c85c1de2973f2ed769
      logger.debug('Checking and deleting all poisoned entries in OnlineMembers table if any exists')
      const prepareDeletion = database.prepare('DELETE FROM OnlineMembers')
      const onlineMembersCount = prepareDeletion.run().changes
      logger.debug(`Deleted ${onlineMembersCount} entries in OnlineMembers.`)
      if (onlineMembersCount > 0) {
        logger.warn('OnlineMembers entries have all been deleted')
      }
    }
  }

  // reference: ./users/mojang.ts
  database.exec(
    'CREATE TABLE IF NOT EXISTS "mojang" (' +
      '  uuid TEXT PRIMARY KEY NOT NULL,' +
      '  username TEXT UNIQUE NOT NULL,' +
      '  loweredName TEXT UNIQUE NOT NULL,' + // username all lowercased to use make it easily indexable
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
      ' )'
  )

  // reference: ./users/verification.ts
  database.exec(
    'CREATE TABLE IF NOT EXISTS "links" (' +
      '  uuid TEXT NOT NULL,' +
      '  discordId TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  PRIMARY KEY(uuid, discordId)' +
      ' )'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'inferences' (" +
      '  uuid TEXT NOT NULL,' +
      '  discordId TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
      '  PRIMARY KEY(uuid, discordId)' +
      ' )'
  )

  // reference: ./users/score-manager.ts
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'DiscordMessages' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'MinecraftMessages' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'DiscordCommands' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'MinecraftCommands' (" +
      '  timestamp INTEGER NOT NULL,' +
      '  user TEXT NOT NULL,' +
      '  count INTEGER NOT NULL DEFAULT 0,' +
      '  PRIMARY KEY(timestamp, user)' +
      ')'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'AllMembers' (" +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  uuid TEXT NOT NULL,' +
      "  fromDate TEXT NOT NULL GENERATED ALWAYS AS (date(fromTimestamp, 'unixepoch')) STORED, " +
      '  fromTimestamp INTEGER NOT NULL,' +
      "  toDate TEXT NOT NULL GENERATED ALWAYS AS (date(toTimestamp, 'unixepoch')) STORED, " +
      '  toTimestamp INTEGER NOT NULL,' +
      '  CONSTRAINT "timeRange" CHECK(fromTimestamp <= toTimestamp)' +
      ' )'
  )
  database.exec(
    "CREATE TABLE IF NOT EXISTS 'OnlineMembers' (" +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  uuid TEXT NOT NULL,' +
      "  fromDate TEXT NOT NULL GENERATED ALWAYS AS (date(fromTimestamp ,'unixepoch')) STORED, " +
      '  fromTimestamp INTEGER NOT NULL,' +
      "  toDate TEXT NOT NULL GENERATED ALWAYS AS (date(toTimestamp, 'unixepoch')) STORED, " +
      '  toTimestamp INTEGER NOT NULL,' +
      '  CONSTRAINT "timeRange" CHECK(fromTimestamp <= toTimestamp)' +
      ' );'
  )
  database.exec('CREATE INDEX IF NOT EXISTS allMembersAppend ON "AllMembers" (uuid, fromDate, toDate);')
  database.exec('CREATE INDEX IF NOT EXISTS onlineMembersAppend ON "OnlineMembers" (uuid, fromDate, toDate);')

  database.pragma('user_version = 1')
}

function migrateFrom1to2(database: Database, logger: Logger4Js, newlyCreated: boolean): void {
  if (!newlyCreated) logger.debug('Migrating database from version 1 to 2')

  // reference: moderation/punishments.ts
  database.exec(
    'CREATE TABLE "punishments" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  originInstance TEXT NOT NULL,' +
      '  userId TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  reason TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL,' +
      '  till INTEGER NOT NULL' +
      ' )'
  )
  database.exec('CREATE INDEX punishmentsIndex ON "punishments" (originInstance, userId);')

  // reference: moderation/commands-heat.ts
  database.exec(
    'CREATE TABLE "heatsCommands" (' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,' +
      '  originInstance TEXT NOT NULL,' +
      '  userId TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  createdAt INTEGER NOT NULL' +
      ' )'
  )
  database.exec(
    'CREATE TABLE "heatsCommandsWarnings" (' +
      '  originInstance TEXT NOT NULL,' +
      '  userId TEXT NOT NULL,' +
      '  type TEXT NOT NULL,' +
      '  warnedAt INTEGER NOT NULL,' +
      '  PRIMARY KEY(originInstance, userId, type)' +
      ' )'
  )
  database.exec('CREATE INDEX heatsCommandsIndex ON "heatsCommands" (originInstance, userId);')

  database.pragma('user_version = 2')
}
