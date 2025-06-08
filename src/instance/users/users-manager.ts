import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'
import { SqliteManager } from '../../common/sqlite-manager.js'

import Autocomplete from './features/autocomplete.js'
import { GuildManager } from './features/guild-manager.js'
import ScoresManager from './features/scores-manager.js'

export default class UsersManager extends Instance<InstanceType.Util> {
  public readonly scoresManager: ScoresManager
  public readonly autoComplete: Autocomplete
  public readonly guildManager: GuildManager

  private readonly sqliteManager: SqliteManager

  public constructor(application: Application) {
    super(application, InternalInstancePrefix + 'UsersManager', InstanceType.Util)

    this.sqliteManager = new SqliteManager(application, application.getConfigFilePath('users.sqlite'))
    this.guildManager = new GuildManager(application, this, this.eventHelper, this.logger, this.errorHandler)

    this.autoComplete = new Autocomplete(application, this, this.eventHelper, this.logger, this.errorHandler)
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
