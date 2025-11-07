import type { Configuration, ConfigurationsManager } from '../configurations'

export class ModerationConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('moderation')
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
