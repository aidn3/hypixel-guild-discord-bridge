import Duration from '../../utility/duration'
import type { Configuration, ConfigurationsManager } from '../configurations'

export class DiscordConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('discord')
  }

  public getMaxTemporarilyInteractions(): number {
    return this.configuration.getNumber('temporarilyInteractionsCount', 5)
  }

  public setMaxTemporarilyInteractions(value: number): void {
    this.configuration.setNumber('temporarilyInteractionsCount', value)
  }

  public getDurationTemporarilyInteractions(): Duration {
    const value = this.configuration.getNumber('temporarilyInteractionsDuration', Duration.minutes(15).toSeconds())
    return Duration.seconds(value)
  }

  public setDurationTemporarilyInteractions(value: Duration): void {
    this.configuration.setNumber('temporarilyInteractionsDuration', value.toSeconds())
  }
}
