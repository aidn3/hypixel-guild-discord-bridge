import Duration from '../utility/duration'

import type { Configuration, ConfigurationsManager } from './configurations'

export enum SpontaneousEventsNames {
  QuickMath = 'quickMath',
  CountingChain = 'countingChain',
  Unscramble = 'unscramble',
  Trivia = 'trivia'
}

export class SpontaneousEventsConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('spontaneous-events')
  }

  public getEnabled(): boolean {
    return this.configuration.getBoolean('enabled', true)
  }

  public setEnabled(enabled: boolean): void {
    this.configuration.setBoolean('enabled', enabled)
  }

  public getEnabledEvents(): string[] {
    return this.configuration.getStringArray('enabledEvents', Object.values(SpontaneousEventsNames))
  }

  public setEnabledEvents(eventNames: SpontaneousEventsNames[]): void {
    this.configuration.setStringArray('enabledEvents', eventNames)
  }

  public getCountingChainDuration(): Duration {
    const seconds = this.configuration.getNumber('countingChainDuration', 10)
    return Duration.seconds(seconds)
  }

  public setCountingChainDuration(duration: Duration): void {
    this.configuration.setNumber('countingChainDuration', duration.toSeconds())
  }

  public getQuickMathDuration(): Duration {
    const seconds = this.configuration.getNumber('quickMathDuration', 30)
    return Duration.seconds(seconds)
  }

  public setQuickMathDuration(duration: Duration): void {
    this.configuration.setNumber('quickMathDuration', duration.toSeconds())
  }

  public getTriviaDuration(): Duration {
    const seconds = this.configuration.getNumber('triviaDuration', 30)
    return Duration.seconds(seconds)
  }

  public setTriviaDuration(duration: Duration): void {
    this.configuration.setNumber('triviaDuration', duration.toSeconds())
  }

  public getUnscrambleDuration(): Duration {
    const seconds = this.configuration.getNumber('unscrambleDuration', 30)
    return Duration.seconds(seconds)
  }

  public setUnscrambleDuration(duration: Duration): void {
    this.configuration.setNumber('unscrambleDuration', duration.toSeconds())
  }

  public getActivityDuration(): Duration {
    const milliseconds = this.configuration.getNumber('activityDuration', Duration.minutes(30).toMilliseconds())
    return Duration.milliseconds(milliseconds)
  }
  public setActivityDuration(duration: Duration): void {
    this.configuration.setNumber('activityDuration', Math.ceil(duration.toMilliseconds()))
  }

  public getMinimumMessages(): number {
    return this.configuration.getNumber('minimumMessages', 30)
  }
  public setMinimumMessages(messages: number): void {
    this.configuration.setNumber('minimumMessages', messages)
  }

  public getCooldownDuration(): Duration {
    const milliseconds = this.configuration.getNumber('cooldownDuration', Duration.minutes(30).toMilliseconds())
    return Duration.milliseconds(milliseconds)
  }
  public setCooldownDuration(duration: Duration): void {
    this.configuration.setNumber('cooldownDuration', Math.ceil(duration.toMilliseconds()))
  }

  public getMinimumUsers(): number {
    return this.configuration.getNumber('minimumUsers', 3)
  }
  public setMinimumUsers(minimumUsers: number): void {
    this.configuration.setNumber('minimumUsers', minimumUsers)
  }
}
