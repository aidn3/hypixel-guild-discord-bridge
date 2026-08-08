import type { Configuration, ConfigurationsManager } from '../../core/configurations'

export class EconomyConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('economy')
  }

  public getAllowModeratorsManagement(): boolean {
    return this.configuration.getBoolean('allowModeratorsManagement', false)
  }

  public setAllowModeratorsManagement(enabled: boolean): void {
    this.configuration.setBoolean('allowModeratorsManagement', enabled)
  }

  public getDailyIngameOnly(): boolean {
    return this.configuration.getBoolean('dailyIngameOnly', true)
  }

  public setDailyIngameOnly(enabled: boolean): void {
    this.configuration.setBoolean('dailyIngameOnly', enabled)
  }
}
