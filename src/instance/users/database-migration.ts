import type { Database } from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../../application'
import type { SqliteManager } from '../../common/sqlite-manager'

export default class DatabaseMigration {
  constructor(
    private readonly application: Application,
    private readonly logger: Logger
  ) {}

  public migrate(sqliteManager: SqliteManager, sqliteName: string): void {
    const database = sqliteManager.getDatabase()

    const transaction = database.transaction(() => {
      let finished = false
      let changed = false
      while (!finished) {
        const currentVersion = database.pragma('user_version', { simple: true }) as number
        switch (currentVersion) {
          case 0: {
            changed = true
            this.migrateFrom0to1(database)
            break
          }
          case 1: {
            if (changed) {
              const backupPath = this.application.getBackupPath(sqliteName)
              this.application.applicationIntegrity.addConfigPath(backupPath)
              this.logger.debug(`Backing up old database before committing changes. backup path: ${backupPath}`)
              sqliteManager.backup(backupPath)
            }

            this.logger.info('Database schema is on latest version')
            finished = true
            break
          }
          default: {
            throw new Error(`Unrecognized database version: ${currentVersion}`)
          }
        }
      }
    })

    transaction()
  }

  private migrateFrom0to1(database: Database): void {
    const checkedIfFresh = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    const existingTable = checkedIfFresh.pluck(true).get('OnlineMembers')
    if (existingTable) {
      this.logger.debug('Migrating database from version 0 to 1')

      // Check git commit: 9495ee42a6f50542d18938c85c1de2973f2ed769
      this.logger.debug('Checking and deleting all poisoned entries in OnlineMembers table if any exists')
      const prepareDeletion = database.prepare('DELETE FROM OnlineMembers')
      const onlineMembersCount = prepareDeletion.run().changes
      this.logger.debug(`Deleted ${onlineMembersCount} entries in OnlineMembers.`)
      if (onlineMembersCount > 0) {
        this.logger.warn('OnlineMembers entries have all been deleted')
      }
    }

    database.pragma('user_version = 1')
  }
}
