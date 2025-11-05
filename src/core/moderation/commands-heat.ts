import fs from 'node:fs'

import type Database from 'better-sqlite3'
import type { Logger } from 'log4js'

import type Application from '../../application'
import { InstanceType } from '../../common/application-event'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { User, UserIdentifier } from '../../common/user'
import Duration from '../../utility/duration'

import type { ModerationConfigurations } from './moderation-configurations'

export class CommandsHeat {
  private static readonly ActionExpiresAfter = Duration.days(1)
  private static readonly WarnPercentage = 0.8
  private static readonly WarnEvery = Duration.minutes(30)

  private readonly moderationConfig

  constructor(
    private readonly sqliteManager: SqliteManager,
    application: Application,
    config: ModerationConfigurations,
    logger: Logger
  ) {
    this.moderationConfig = config

    sqliteManager.registerCleaner(() => {
      const database = sqliteManager.getDatabase()
      database.transaction(() => {
        const deleteStatement = database.prepare('DELETE FROM "heatsCommands" WHERE createdAt < ?')
        const oldestTimestamp = Date.now() - CommandsHeat.ActionExpiresAfter.toMilliseconds()
        const result = deleteStatement.run(Math.floor(oldestTimestamp / 1000)).changes
        if (result > 0) logger.debug(`Deleted ${result} entry of expired heats-commands`)
      })()
    })

    this.migrateAnyOldData(application, logger)
  }

  public add(user: User, type: HeatType): HeatResult {
    const currentTime = Date.now()

    const database = this.sqliteManager.getDatabase()
    const userIdentifier = user.getUserIdentifier()
    const allIdentifiers = user.allIdentifiers()
    const action: HeatAction = { identifier: user.getUserIdentifier(), timestamp: currentTime, type: type }

    const transaction = database.transaction(() => {
      if (user.immune()) {
        this.addEntries(database, [action])
        return HeatResult.Allowed
      }

      const heatActions = this.getUserHeats(database, currentTime, allIdentifiers, type)
      const typeInfo = this.resolveType(type)

      this.addEntries(database, [action])

      if (heatActions >= typeInfo.maxLimit) return HeatResult.Denied

      // 1+ added to help with low warnLimit
      if (heatActions + 1 >= typeInfo.warnLimit && !this.warned(database, currentTime, allIdentifiers, type)) {
        this.setLastWarning(database, currentTime, userIdentifier, type)
        return HeatResult.Warn
      }

      return HeatResult.Allowed
    })

    return transaction()
  }

  public tryAdd(user: User, type: HeatType): HeatResult {
    const currentTime = Date.now()

    const database = this.sqliteManager.getDatabase()
    const userIdentifier = user.getUserIdentifier()
    const allIdentifiers = user.allIdentifiers()
    const action: HeatAction = { identifier: user.getUserIdentifier(), timestamp: currentTime, type: type }
    const transaction = database.transaction(() => {
      if (user.immune()) {
        this.addEntries(database, [action])
        return HeatResult.Allowed
      }

      const heatActions = this.getUserHeats(database, currentTime, allIdentifiers, type)
      const typeInfo = this.resolveType(type)

      if (heatActions >= typeInfo.maxLimit) return HeatResult.Denied

      this.addEntries(database, [action])

      // 1+ added to help with low warnLimit
      if (heatActions + 1 >= typeInfo.warnLimit && !this.warned(database, currentTime, allIdentifiers, type)) {
        this.setLastWarning(database, currentTime, userIdentifier, type)
        return HeatResult.Warn
      }

      return HeatResult.Allowed
    })

    return transaction()
  }

  private addEntries(database: Database.Database, heatActions: HeatAction[]): void {
    const insert = database.prepare(
      'INSERT INTO "heatsCommands" (originInstance, userId, type, createdAt) VALUES (?, ?, ?, ?)'
    )

    for (const heatAction of heatActions) {
      insert.run(
        heatAction.identifier.originInstance,
        heatAction.identifier.userId,
        heatAction.type,
        Math.floor(heatAction.timestamp / 1000)
      )
    }
  }

  private getUserHeats(
    database: Database.Database,
    currentTime: number,
    identifiers: UserIdentifier[],
    type: HeatType
  ): number {
    let query = 'SELECT COUNT(*) FROM "heatsCommands" WHERE '
    const parameters: unknown[] = []

    if (identifiers.length > 0) {
      query += '('
      for (let index = 0; index < identifiers.length; index++) {
        const identifier = identifiers[index]

        parameters.push(identifier.originInstance)
        parameters.push(identifier.userId)

        query += `(originInstance = ? AND userId = ?)`
        if (index !== identifiers.length - 1) query += ' OR '
      }
      query += ') AND '
    }

    query += 'type = ? AND createdAt > ?'
    parameters.push(type)
    parameters.push(Math.floor((currentTime - CommandsHeat.ActionExpiresAfter.toMilliseconds()) / 1000))

    return database.prepare(query).pluck(true).get(parameters) as number
  }

  private warned(
    database: Database.Database,
    currentTime: number,
    identifiers: UserIdentifier[],
    type: HeatType
  ): boolean {
    let query = 'SELECT IFNULL(MAX(warnedAt), 0) FROM "heatsCommandsWarnings" WHERE '
    const parameters: unknown[] = []

    if (identifiers.length > 0) {
      query += '('
      for (let index = 0; index < identifiers.length; index++) {
        const identifier = identifiers[index]

        parameters.push(identifier.originInstance)
        parameters.push(identifier.userId)

        query += `(originInstance = ? AND userId = ?)`
        if (index !== identifiers.length - 1) query += ' OR '
      }
      query += ') AND '
    }

    query += 'type = ?'
    parameters.push(type)

    const lastWarning = database.prepare(query).pluck(true).get(parameters) as number

    return lastWarning * 1000 + CommandsHeat.WarnEvery.toMilliseconds() > currentTime
  }

  private setLastWarning(
    database: Database.Database,
    timestamp: number,
    identifier: UserIdentifier,
    type: HeatType
  ): void {
    const replace = database.prepare(
      'INSERT OR REPLACE INTO "heatsCommandsWarnings" (originInstance, userId, type, warnedAt) VALUES(?, ?, ?, ?)'
    )
    replace.run(identifier.originInstance, identifier.userId, type, Math.floor(timestamp / 1000))
  }

  private resolveType(type: HeatType): { expire: Duration; maxLimit: number; warnLimit: number; warnEvery: Duration } {
    const common = { expire: CommandsHeat.ActionExpiresAfter, warnEvery: CommandsHeat.WarnEvery }
    switch (type) {
      case HeatType.Mute: {
        return { ...common, ...CommandsHeat.resolveLimits(this.moderationConfig.getMutesPerDay()) }
      }
      case HeatType.Kick: {
        return { ...common, ...CommandsHeat.resolveLimits(this.moderationConfig.getKicksPerDay()) }
      }
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`Type ${type} does not exists??`)
  }

  private static resolveLimits(maxLimit: number): { maxLimit: number; warnLimit: number } {
    const limits = { maxLimit: maxLimit, warnLimit: maxLimit }
    if (maxLimit <= 0) {
      limits.maxLimit = limits.warnLimit = Number.MAX_SAFE_INTEGER
      return limits
    } else if (maxLimit === 1) {
      return limits
    } else {
      limits.warnLimit = maxLimit * this.WarnPercentage
      return limits
    }
  }

  private migrateAnyOldData(application: Application, logger: Logger): void {
    interface OldEntry {
      identifiers: string[]
      heatActions: { timestamp: number; type: 'kick' | 'mute' }[]
      lastWarning: Record<'kick' | 'mute', number>
    }

    interface OldType {
      heats?: OldEntry[]
    }

    const path = application.getConfigFilePath('commands-heat.json')
    if (!fs.existsSync(path)) return
    logger.info('Found old commands-heat file. Migrating this file into the new system...')

    const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as OldType
    oldObject.heats ??= []
    const heatActions: HeatAction[] = []
    let total = 0

    for (const entry of oldObject.heats) {
      total += entry.heatActions.length

      const identifier = this.findIdentifier(entry.identifiers)
      if (identifier == undefined) continue

      for (const heatAction of entry.heatActions) {
        let type: HeatType | undefined
        switch (heatAction.type) {
          case 'kick': {
            type = HeatType.Kick
            break
          }
          case 'mute': {
            type = HeatType.Mute
            break
          }
          default: {
            continue
          }
        }

        heatActions.push({ identifier: identifier, type: type, timestamp: heatAction.timestamp })
      }
    }

    logger.info(`Successfully parsed ${heatActions.length} legacy commands-heat out of ${total}`)
    const database = this.sqliteManager.getDatabase()
    database.transaction(() => {
      this.addEntries(database, heatActions)
    })()

    logger.debug('Deleting commands-heat legacy file...')
    fs.rmSync(path)
  }

  findIdentifier(identifiers: string[]): UserIdentifier | undefined {
    const uuid = identifiers.find((entry) => entry.length === 32)
    if (uuid !== undefined) {
      return { originInstance: InstanceType.Minecraft, userId: uuid }
    }

    const discordId = identifiers.find((entry) => /^\d+$/.test(entry))
    if (discordId !== undefined) {
      return { originInstance: InstanceType.Discord, userId: discordId }
    }

    return undefined
  }
}

interface HeatAction {
  identifier: UserIdentifier
  type: HeatType
  timestamp: number
}

export enum HeatType {
  Kick = 'kick',
  Mute = 'mute'
}

export enum HeatResult {
  Allowed = 'allowed',
  Warn = 'warn',
  Denied = 'denied'
}
