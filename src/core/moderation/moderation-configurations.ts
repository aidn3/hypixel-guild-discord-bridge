import fs from 'node:fs'

import type { Logger } from 'log4js'

import type Application from '../../application'
import type { SqliteManager } from '../../common/sqlite-manager'
import type { Configuration, ConfigurationsManager } from '../configurations'

export class ModerationConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager, application: Application, logger: Logger, sqliteManager: SqliteManager) {
    this.configuration = manager.create('moderation')

    this.migrateAnyOldData(application, logger, sqliteManager)
  }

  private migrateAnyOldData(application: Application, logger: Logger, sqliteManager: SqliteManager): void {
    interface ModerationConfig {
      heatPunishment: boolean
      mutesPerDay: number
      kicksPerDay: number

      immuneDiscordUsers: string[]
      immuneMojangPlayers: string[]

      profanityEnabled: boolean
      profanityWhitelist: string[]
      profanityBlacklist: string[]
    }

    const path = application.getConfigFilePath('moderation.json')
    if (!fs.existsSync(path)) return
    logger.info('Found old moderation file. Migrating it into the new system...')

    sqliteManager.getDatabase().transaction(() => {
      const oldObject = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<ModerationConfig>
      if (oldObject.heatPunishment !== undefined) {
        this.setHeatPunishment(oldObject.heatPunishment)
      }
      if (oldObject.mutesPerDay !== undefined) {
        this.setMutesPerDay(oldObject.mutesPerDay)
      }
      if (oldObject.kicksPerDay !== undefined) {
        this.setKicksPerDay(oldObject.kicksPerDay)
      }

      if (oldObject.immuneDiscordUsers !== undefined) {
        this.setImmuneDiscordUsers(oldObject.immuneDiscordUsers)
      }
      if (oldObject.immuneMojangPlayers !== undefined) {
        this.setImmuneMojangPlayers(oldObject.immuneMojangPlayers)
      }

      if (oldObject.profanityEnabled !== undefined) {
        this.setProfanityEnabled(oldObject.profanityEnabled)
      }
      if (oldObject.profanityWhitelist !== undefined) {
        this.setProfanityWhitelist(oldObject.profanityWhitelist)
      }
      if (oldObject.profanityBlacklist !== undefined) {
        this.setProfanityBlacklist(oldObject.profanityBlacklist)
      }
    })()

    logger.info(`Successfully parsed old moderation file. Deleting the old file...`)
    fs.rmSync(path)
  }

  public getHeatPunishment(): boolean {
    return this.configuration.getBoolean('heatPunishment', true)
  }

  public setHeatPunishment(heatPunishment: boolean): void {
    this.configuration.setBoolean('heatPunishment', heatPunishment)
  }

  public getMutesPerDay(): number {
    return this.configuration.getNumber('mutesPerDay', 10)
  }

  public setMutesPerDay(mutesPerDay: number): void {
    this.configuration.setNumber('mutesPerDay', mutesPerDay)
  }

  public getKicksPerDay(): number {
    return this.configuration.getNumber('kicksPerDay', 5)
  }

  public setKicksPerDay(mutesPerDay: number): void {
    this.configuration.setNumber('kicksPerDay', mutesPerDay)
  }

  public getImmuneDiscordUsers(): string[] {
    return this.configuration.getStringArray('immuneDiscordUsers', [])
  }

  public setImmuneDiscordUsers(users: string[]): void {
    this.configuration.setStringArray('immuneDiscordUsers', users)
  }

  public getImmuneMojangPlayers(): string[] {
    return this.configuration.getStringArray('immuneMojangPlayers', [])
  }

  public setImmuneMojangPlayers(users: string[]): void {
    this.configuration.setStringArray('immuneMojangPlayers', users)
  }

  public getProfanityEnabled(): boolean {
    return this.configuration.getBoolean('profanityEnabled', true)
  }

  public setProfanityEnabled(value: boolean): void {
    this.configuration.setBoolean('profanityEnabled', value)
  }

  public getProfanityWhitelist(): string[] {
    return this.configuration.getStringArray('profanityWhitelist', [
      'sadist',
      'hell',
      'damn',
      'god',
      'shit',
      'balls',
      'retard'
    ])
  }

  public setProfanityWhitelist(values: string[]): void {
    this.configuration.setStringArray('profanityWhitelist', values)
  }

  public getProfanityBlacklist(): string[] {
    return this.configuration.getStringArray('profanityBlacklist', [])
  }

  public setProfanityBlacklist(values: string[]): void {
    this.configuration.setStringArray('profanityBlacklist', values)
  }
}
