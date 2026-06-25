import type { Configuration, ConfigurationsManager } from './configurations'

export class ApplicationConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('general')
  }

  public getOriginTag(): boolean {
    return this.configuration.getBoolean('originTag', false)
  }

  public setOriginTag(originTag: boolean): void {
    this.configuration.setBoolean('originTag', originTag)
  }

  public getStarfallCultReminder(): boolean {
    return this.configuration.getBoolean('starfallCultReminder', true)
  }

  public setStarfallCultReminder(enabled: boolean): void {
    this.configuration.setBoolean('starfallCultReminder', enabled)
  }

  public getDarkAuctionReminder(): boolean {
    return this.configuration.getBoolean('darkAuctionReminder', true)
  }

  public setDarkAuctionReminder(enabled: boolean): void {
    this.configuration.setBoolean('darkAuctionReminder', enabled)
  }
}
