import type { Configuration, ConfigurationsManager } from './configurations'

export class MigrationConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('migration')
  }

  public getDeleteDiscordGuildCommands(): boolean {
    return this.configuration.getBoolean('deleteDiscordGuildCommands', false)
  }

  public setDeleteDiscordGuildCommands(on: boolean): void {
    this.configuration.setBoolean('deleteDiscordGuildCommands', on)
  }
}
