import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type { SqliteManager } from '../../../common/sqlite-manager.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type { MojangProfile } from '../../../utility/mojang.js'
import type UsersManager from '../users-manager.js'

export class Mojang extends EventHandler<UsersManager, InstanceType.Utility, void> {
  private static readonly MaxAge = 7 * 24 * 60 * 60 * 1000

  constructor(
    application: Application,
    clientInstance: UsersManager,
    eventHelper: EventHelper<InstanceType.Utility>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    private readonly sqliteManager: SqliteManager
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    sqliteManager.register(
      'mojang',
      'CREATE TABLE IF NOT EXISTS "mojang" (' +
        '  uuid TEXT PRIMARY KEY NOT NULL,' +
        '  username TEXT UNIQUE NOT NULL,' +
        '  loweredName TEXT UNIQUE NOT NULL,' + // username all lowercased to use make it easily indexable
        '  createdAt INTEGER NOT NULL DEFAULT (unixepoch())' +
        ' )'
    )
  }

  public add(profiles: MojangProfile[]): void {
    const database = this.sqliteManager.getDatabase()
    const insert = database.prepare(
      'INSERT OR REPLACE INTO "mojang" (uuid, username, loweredName) VALUES (@uuid, @username, @loweredName)'
    )

    const transaction = database.transaction(() => {
      for (const profile of profiles) {
        insert.run({ uuid: profile.id, username: profile.name, loweredName: profile.name.toLowerCase() })
      }
    })

    transaction()
  }

  public profileByUsername(username: string): MojangProfile | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      'SELECT uuid as id, username as name FROM "mojang" WHERE loweredName = @loweredName AND createdAt > @createdAt'
    )
    return select.get({
      loweredName: username.toLowerCase(),
      createdAt: Math.floor((Date.now() - Mojang.MaxAge) / 1000)
    }) as MojangProfile | undefined
  }

  public profileByUuid(uuid: string): MojangProfile | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare(
      'SELECT uuid as id, username as name FROM "mojang" WHERE uuid = @uuid AND createdAt > @createdAt'
    )
    return select.get({ uuid: uuid, createdAt: Math.floor((Date.now() - Mojang.MaxAge) / 1000) }) as
      | MojangProfile
      | undefined
  }
}
