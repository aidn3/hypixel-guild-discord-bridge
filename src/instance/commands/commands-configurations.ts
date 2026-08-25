import type { Configuration, ConfigurationsManager } from '../../core/configurations.js'

export class CommandsConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('commands')
  }

  public getCommandsEnabled(): boolean {
    return this.configuration.getBoolean('enabled', true)
  }

  public setCommandsEnabled(enabled: boolean): void {
    this.configuration.setBoolean('enabled', enabled)
  }

  public getAllowHelperToggle(): boolean {
    return this.configuration.getBoolean('allowHelperToggle', true)
  }

  public setAllowHelperToggle(enabled: boolean): void {
    this.configuration.setBoolean('allowHelperToggle', enabled)
  }

  public getSuggestionsEnabled(): boolean {
    return this.configuration.getBoolean('enableSuggestions', true)
  }

  public setSuggestionsEnabled(enabled: boolean): void {
    this.configuration.setBoolean('enableSuggestions', enabled)
  }
}
