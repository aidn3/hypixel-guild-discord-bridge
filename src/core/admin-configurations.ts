import type { Configuration, ConfigurationsManager } from './configurations'

export class AdminConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('admin')
  }

  public getAutoRestart(): boolean {
    return this.configuration.getBoolean('autoRestart', false)
  }

  public setAutoRestart(autoRestart: boolean): void {
    this.configuration.setBoolean('autoRestart', autoRestart)
  }

  public getAllowCreateMinecraft(): boolean {
    return this.configuration.getBoolean('allowCreateMinecraft', true)
  }

  public setAllowCreateMinecraft(enabled: boolean): void {
    this.configuration.setBoolean('allowCreateMinecraft', enabled)
  }

  public getMaxMinecraft(): number {
    return this.configuration.getNumber('maxMinecraft', 9999)
  }

  public setMaxMinecraft(count: number): void {
    this.configuration.setNumber('maxMinecraft', count)
  }

  public getRequireProxy(): boolean {
    return this.configuration.getBoolean('requireProxy', false)
  }

  public setRequireProxy(enabled: boolean): void {
    this.configuration.setBoolean('requireProxy', enabled)
  }

  public getAllowJoinDiscord(): boolean {
    return this.configuration.getBoolean('allowJoinDiscord', false)
  }

  public setAllowJoinDiscord(enabled: boolean): void {
    this.configuration.setBoolean('allowJoinDiscord', enabled)
  }

  public getAllowCustomPicture(): boolean {
    return this.configuration.getBoolean('allowCustomPicture', false)
  }

  public setAllowCustomPicture(enabled: boolean): void {
    this.configuration.setBoolean('allowCustomPicture', enabled)
  }

  public getAllowCustomBanner(): boolean {
    return this.configuration.getBoolean('allowCustomBanner', false)
  }

  public setAllowCustomBanner(enabled: boolean): void {
    this.configuration.setBoolean('allowCustomBanner', enabled)
  }

  public getAllowCustomBio(): boolean {
    return this.configuration.getBoolean('allowCustomBio', false)
  }

  public setAllowCustomBio(enabled: boolean): void {
    this.configuration.setBoolean('allowCustomBio', enabled)
  }
}
