import type { Database } from 'better-sqlite3'
import type { Logger as Logger4Js } from 'log4js'

import type { SqliteManager } from '../common/sqlite-manager'

const CurrentVersion = 1

export function registerMigration(sqliteManager: SqliteManager, name: string): void {
  sqliteManager.setTargetVersion(CurrentVersion)
  sqliteManager.registerMigrator(0, (database, logger) => {
    migrateFrom0to1(database, logger)
  })
  sqliteManager.migrate(name)
}

function migrateFrom0to1(database: Database, logger: Logger4Js): void {
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

  database.pragma('user_version = 1')
}
