// eslint-disable-next-line import/no-restricted-paths
import Reaction from '../instance/minecraft/handlers/reaction.js'

import type { Configuration, ConfigurationsManager } from './configurations.js'

export enum ApplicationLanguages {
  English = 'en',
  German = 'de',
  Arabic = 'ar'
}

export class LanguageConfigurations {
  public static readonly DefaultLanguage = ApplicationLanguages.English
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('language')
  }

  public getLanguage(): ApplicationLanguages {
    return this.configuration.getString('language', LanguageConfigurations.DefaultLanguage) as ApplicationLanguages
  }

  public setLanguage(language: ApplicationLanguages): void {
    this.configuration.setString('language', language)
  }

  public getGuildJoinReaction(): string[] {
    return this.configuration.getStringArray('guildJoinReaction', Reaction.JoinMessages)
  }

  public setGuildJoinReaction(values: string[]): void {
    this.configuration.setStringArray('guildJoinReaction', values)
  }

  public getGuildLeaveReaction(): string[] {
    return this.configuration.getStringArray('guildLeaveReaction', Reaction.LeaveMessages)
  }

  public setGuildLeaveReaction(values: string[]): void {
    this.configuration.setStringArray('guildLeaveReaction', values)
  }

  public getGuildKickReaction(): string[] {
    return this.configuration.getStringArray('guildKickReaction', Reaction.KickMessages)
  }

  public setGuildKickReaction(values: string[]): void {
    this.configuration.setStringArray('guildKickReaction', values)
  }
}
