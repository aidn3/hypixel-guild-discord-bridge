import type { Identity } from '@kolapsis/shm-sdk'

import type { Configuration, ConfigurationsManager } from '../../core/configurations'

export class MetricsConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('metrics')
  }

  public getTotalMessages(): number {
    return this.configuration.getNumber('totalMessages', 0)
  }

  public setTotalMessages(count: number): void {
    this.configuration.setNumber('totalMessages', count)
  }
  public getTotalCommands(): number {
    return this.configuration.getNumber('totalCommands', 0)
  }

  public setTotalCommands(count: number): void {
    this.configuration.setNumber('totalCommands', count)
  }

  public getIdentityObject(): Identity | undefined {
    const result = this.configuration.getString('identity', '')
    if (result.length === 0) return undefined
    return JSON.parse(result) as Identity
  }

  public setIdentityObject(identityObject: Identity): void {
    this.configuration.setString('identity', JSON.stringify(identityObject))
  }
}
