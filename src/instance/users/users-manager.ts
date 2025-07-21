import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'
import { SqliteManager } from '../../common/sqlite-manager.js'

import DatabaseMigration from './database-migration'
import Autocomplete from './features/autocomplete.js'
import { GuildManager } from './features/guild-manager.js'
import { Mojang } from './features/mojang.js'
import ScoresManager from './features/scores-manager.js'
import { Verification } from './features/verification.js'

export default class UsersManager extends Instance<InstanceType.Utility> {
  public readonly mojangDatabase: Mojang
  public readonly verification: Verification
  public readonly scoresManager: ScoresManager
  public readonly autoComplete: Autocomplete
  public readonly guildManager: GuildManager

  private readonly sqliteManager: SqliteManager

  public constructor(application: Application) {
    super(application, InternalInstancePrefix + 'UsersManager', InstanceType.Utility)

    const sqliteName = 'users.sqlite'
    this.sqliteManager = new SqliteManager(application, application.getConfigFilePath(sqliteName))
    const migrationProcess = new DatabaseMigration(this.application, this.logger)
    migrationProcess.migrate(this.sqliteManager, sqliteName)

    this.mojangDatabase = new Mojang(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.sqliteManager
    )

    this.guildManager = new GuildManager(application, this, this.eventHelper, this.logger, this.errorHandler)

    this.autoComplete = new Autocomplete(application, this, this.eventHelper, this.logger, this.errorHandler)

    this.verification = new Verification(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.sqliteManager
    )
    this.scoresManager = new ScoresManager(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.sqliteManager
    )
  }
}
