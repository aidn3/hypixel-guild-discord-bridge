import type { Configuration, ConfigurationsManager } from '../configurations'

export class CommandsConfigurations {
  private static readonly DefaultCommandPrefix: string = '!'

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

  public getChatPrefix(): string {
    return this.configuration.getString('chatPrefix', CommandsConfigurations.DefaultCommandPrefix)
  }

  public setChatPrefix(prefix: string): void {
    this.configuration.setString('chatPrefix', prefix)
  }

  public getDisabledCommands(): string[] {
    return this.configuration.getStringArray('disabledCommands', [])
  }

  public setDisabledCommands(disabledCommands: string[]): void {
    this.configuration.setStringArray('disabledCommands', disabledCommands)
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
