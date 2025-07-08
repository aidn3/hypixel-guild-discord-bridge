import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type { SqliteManager } from '../../../common/sqlite-manager.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type UsersManager from '../users-manager.js'

export class Verification extends EventHandler<UsersManager, InstanceType.Util, void> {
  private readonly database: VerificationDatabase

  constructor(
    application: Application,
    clientInstance: UsersManager,
    eventHelper: EventHelper<InstanceType.Util>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    sqliteManager: SqliteManager
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.database = new VerificationDatabase(sqliteManager)
  }

  public findByDiscord(discordId: string): Awaitable<Link> {
    const savedLink = this.database.getLinkByDiscord(discordId)
    if (savedLink !== undefined)
      return {
        type: LinkType.Confirmed,
        link: { discordId: savedLink.discordId, uuid: savedLink.uuid }
      }

    const savedInference = this.database.getInferenceByDiscord(discordId)
    if (savedInference !== undefined)
      return {
        type: LinkType.Inference,
        link: { discordId: savedInference.discordId, uuid: savedInference.uuid }
      }

    return { type: LinkType.None }
  }

  public findByIngame(uuid: string): Awaitable<Link> {
    const savedLink = this.database.getLinkByUuid(uuid)
    if (savedLink !== undefined)
      return {
        type: LinkType.Confirmed,
        link: { discordId: savedLink.discordId, uuid: savedLink.uuid }
      }

    const savedInference = this.database.getInferenceByUuid(uuid)
    if (savedInference !== undefined)
      return {
        type: LinkType.Inference,
        link: { discordId: savedInference.discordId, uuid: savedInference.uuid }
      }

    return { type: LinkType.None }
  }

  public addConfirmedLink(discordId: string, uuid: string): void {
    this.database.addLink(discordId, uuid)
  }

  public addInferenceLink(discordId: string, uuid: string): void {
    this.database.addInference(discordId, uuid)
  }

  public invalidate(options: { discordId?: string; uuid?: string }): number {
    let count = 0
    if (options.uuid !== undefined) count += this.database.invalidateUuid(options.uuid)
    if (options.discordId !== undefined) count += this.database.invalidateDiscord(options.discordId)
    return count
  }
}

export enum LinkType {
  None = 'none',
  Inference = 'inference',
  Confirmed = 'confirmed'
}

export type Link = NoneLink | InferenceLink | ConfirmedLink

export interface BaseLink<T extends LinkType> {
  type: T
}

export type NoneLink = BaseLink<LinkType.None>

export interface InferenceLink extends BaseLink<LinkType.Inference> {
  link: LinkInfo
}

export interface ConfirmedLink extends BaseLink<LinkType.Confirmed> {
  link: LinkInfo
}

interface LinkInfo {
  uuid: string
  discordId: string
}

class VerificationDatabase {
  constructor(private readonly sqliteManager: SqliteManager) {
    sqliteManager.register(
      'links',
      'CREATE TABLE IF NOT EXISTS "links" (' +
        '  uuid TEXT NOT NULL,' +
        '  discordId TEXT NOT NULL,' +
        '  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
        '  PRIMARY KEY(uuid, discordId)' +
        ' )'
    )
    sqliteManager.register(
      'inferences',
      "CREATE TABLE IF NOT EXISTS 'inferences' (" +
        '  uuid TEXT NOT NULL,' +
        '  discordId TEXT NOT NULL,' +
        '  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),' +
        '  PRIMARY KEY(uuid, discordId)' +
        ' )'
    )
  }

  public addLink(discordId: string, uuid: string): void {
    const database = this.sqliteManager.getDatabase()
    const deleteOldLinks = database.prepare('DELETE FROM "links" WHERE uuid = ? OR discordId = ?')
    const deleteInferences = database.prepare('DELETE FROM "inferences" WHERE uuid = ? OR discordId = ?')
    const insert = database.prepare('INSERT INTO "links" (uuid, discordId) VALUES (?, ?)')

    const transaction = database.transaction(() => {
      deleteOldLinks.run(uuid, discordId)
      deleteInferences.run(uuid, discordId)
      insert.run(uuid, discordId)
    })

    transaction()
  }

  public getLinkByUuid(uuid: string): LinkInfo | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT uuid, discordId FROM "links" WHERE uuid = ? LIMIT 1')
    return select.get(uuid) as LinkInfo | undefined
  }

  public getLinkByDiscord(discordId: string): LinkInfo | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT uuid, discordId FROM "links" WHERE discordId = ? LIMIT 1')
    return select.get(discordId) as LinkInfo | undefined
  }

  public getInferenceByUuid(uuid: string): LinkInfo | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT uuid, discordId FROM "inferences" WHERE uuid = ? LIMIT 1')
    return select.get(uuid) as LinkInfo | undefined
  }

  public getInferenceByDiscord(discordId: string): LinkInfo | undefined {
    const database = this.sqliteManager.getDatabase()
    const select = database.prepare('SELECT uuid, discordId FROM "inferences" WHERE discordId = ? LIMIT 1')
    return select.get(discordId) as LinkInfo | undefined
  }

  public addInference(discordId: string, uuid: string): void {
    const database = this.sqliteManager.getDatabase()
    const getInferences = database.prepare('SELECT uuid, discordId FROM "inferences" WHERE uuid = ? OR discordId = ?')
    const getLinks = database.prepare('SELECT uuid, discordId FROM "links" WHERE uuid = ? OR discordId = ?')
    const insert = database.prepare('INSERT INTO "inferences" (uuid, discordId) VALUES (?, ?)')

    const transaction = database.transaction(() => {
      const existingLinks = getLinks.get(uuid, discordId)
      if (existingLinks !== undefined) return

      const existingInferences = getInferences.get(uuid, discordId)
      if (existingInferences !== undefined) return

      insert.run(uuid, discordId)
    })

    transaction()
  }

  public invalidateUuid(uuid: string): number {
    const database = this.sqliteManager.getDatabase()

    const deleteOldLinks = database.prepare('DELETE FROM "links" WHERE uuid = ?')
    const deleteInferences = database.prepare('DELETE FROM "inferences" WHERE uuid = ? ')

    const transaction = database.transaction(() => {
      let count = 0
      count += deleteOldLinks.run(uuid).changes
      count += deleteInferences.run(uuid).changes

      return count
    })

    return transaction()
  }

  public invalidateDiscord(discordId: string): number {
    const database = this.sqliteManager.getDatabase()

    const deleteOldLinks = database.prepare('DELETE FROM "links" WHERE discordId = ?')
    const deleteInferences = database.prepare('DELETE FROM "inferences" WHERE discordId = ? ')

    const transaction = database.transaction(() => {
      let count = 0
      count += deleteOldLinks.run(discordId).changes
      count += deleteInferences.run(discordId).changes

      return count
    })

    return transaction()
  }
}
