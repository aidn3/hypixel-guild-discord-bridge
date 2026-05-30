import Duration from '../../utility/duration'
import type { Configuration, ConfigurationsManager } from '../configurations'

export enum DiscordChatFormat {
  MinecraftRender = 'minecraftRender',
  Webhook = 'webhook',
  Embed = 'embed'
}

export class DiscordConfigurations {
  private readonly configuration: Configuration

  constructor(manager: ConfigurationsManager) {
    this.configuration = manager.create('discord')
  }

  public getPublicChannelIds(): string[] {
    return this.configuration.getStringArray('publicChannelIds', [])
  }

  public setPublicChannelIds(channelIds: string[]): void {
    this.configuration.setStringArray('publicChannelIds', channelIds)
  }

  public getOfficerChannelIds(): string[] {
    return this.configuration.getStringArray('officerChannelIds', [])
  }

  public setOfficerChannelIds(channelIds: string[]): void {
    this.configuration.setStringArray('officerChannelIds', channelIds)
  }

  public getHelperRoleIds(): string[] {
    return this.configuration.getStringArray('helperRoleIds', [])
  }

  public setHelperRoleIds(roleIds: string[]): void {
    this.configuration.setStringArray('helperRoleIds', roleIds)
  }

  public getOfficerRoleIds(): string[] {
    return this.configuration.getStringArray('officerRoleIds', [])
  }

  public setOfficerRoleIds(roleIds: string[]): void {
    this.configuration.setStringArray('officerRoleIds', roleIds)
  }

  public getLoggerChannelIds(): string[] {
    return this.configuration.getStringArray('loggerChannelIds', [])
  }

  public setLoggerChannelIds(channelIds: string[]): void {
    this.configuration.setStringArray('loggerChannelIds', channelIds)
  }

  public getAlwaysReplyReaction(): boolean {
    return this.configuration.getBoolean('alwaysReplyReaction', false)
  }

  public setAlwaysReplyReaction(value: boolean): void {
    this.configuration.setBoolean('alwaysReplyReaction', value)
  }

  public getEnforceVerification(): boolean {
    return this.configuration.getBoolean('enforceVerification', false)
  }

  public setEnforceVerification(enabled: boolean): void {
    this.configuration.setBoolean('enforceVerification', enabled)
  }

  public getChatFormat(): DiscordChatFormat {
    return this.configuration.getString('chatFormat', DiscordChatFormat.Webhook) as DiscordChatFormat
  }

  public setChatFormat(format: DiscordChatFormat): void {
    this.configuration.setString('chatFormat', format)
  }

  public getGuildOnline(): boolean {
    return this.configuration.getBoolean('guildOnline', true)
  }

  public setGuildOnline(enabled: boolean): void {
    this.configuration.setBoolean('guildOnline', enabled)
  }

  public getGuildOffline(): boolean {
    return this.configuration.getBoolean('guildOffline', true)
  }

  public setGuildOffline(enabled: boolean): void {
    this.configuration.setBoolean('guildOffline', enabled)
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
