import type { Configuration, ConfigurationsManager } from './configurations.js'

export enum DarkAuctionReminderCondition {
  Disabled = 'disabled',
  Always = 'always',
  Scorpius = 'scorpius'
}

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

  public getDarkAuctionReminder(): DarkAuctionReminderCondition {
    return this.configuration.getString(
      'darkAuctionReminder',
      DarkAuctionReminderCondition.Always
    ) as DarkAuctionReminderCondition
  }

  public setDarkAuctionReminder(option: DarkAuctionReminderCondition): void {
    this.configuration.setString('darkAuctionReminder', option)
  }
}
