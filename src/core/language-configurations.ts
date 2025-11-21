/* eslint-disable import/no-restricted-paths */

import Mute from '../instance/commands/triggers/mute'
import Roulette from '../instance/commands/triggers/roulette'
import Vengeance from '../instance/commands/triggers/vengeance'
import PlayerMuted from '../instance/minecraft/handlers/player-muted'
import Reaction from '../instance/minecraft/handlers/reaction'
import { SkyblockReminders } from '../instance/skyblock-reminders'

import type { Configuration, ConfigurationsManager } from './configurations'

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

  public getDarkAuctionReminder(): string {
    return this.configuration.getString('darkAuctionReminder', SkyblockReminders.DefaultDarkAuctionMessage)
  }

  public setDarkAuctionReminder(darkAuctionReminder: string): void {
    this.configuration.setString('darkAuctionReminder', darkAuctionReminder)
  }

  public getStarfallReminder(): string {
    return this.configuration.getString('starfallReminder', SkyblockReminders.DefaultStarfallMessage)
  }

  public setStarfallReminder(starfallReminder: string): void {
    this.configuration.setString('starfallReminder', starfallReminder)
  }

  public getCommandMuteGame(): string[] {
    return this.configuration.getStringArray('commandMuteGame', Mute.DefaultMessages)
  }

  public setCommandMuteGame(values: string[]): void {
    this.configuration.getStringArray('commandMuteGame', values)
  }

  public getCommandRouletteWin(): string[] {
    return this.configuration.getStringArray('commandRouletteWin', Roulette.WinMessages)
  }
  public setCommandRouletteWin(values: string[]): void {
    this.configuration.getStringArray('commandRouletteWin', values)
  }
  public getCommandRouletteLose(): string[] {
    return this.configuration.getStringArray('commandRouletteLose', Roulette.LossMessages)
  }
  public setCommandRouletteLose(values: string[]): void {
    this.configuration.getStringArray('commandRouletteLose', values)
  }

  public getCommandVengeanceWin(): string[] {
    return this.configuration.getStringArray('commandVengeanceWin', Vengeance.WinMessages)
  }
  public setCommandVengeanceWin(values: string[]): void {
    this.configuration.getStringArray('commandVengeanceWin', values)
  }

  public getCommandVengeanceDraw(): string[] {
    return this.configuration.getStringArray('commandVengeanceDraw', Vengeance.DrawMessages)
  }
  public setCommandVengeanceDraw(values: string[]): void {
    this.configuration.getStringArray('commandVengeanceDraw', values)
  }

  public getCommandVengeanceLose(): string[] {
    return this.configuration.getStringArray('commandVengeanceLose', Vengeance.LossMessages)
  }

  public setCommandVengeanceLose(values: string[]): void {
    this.configuration.setStringArray('commandVengeanceLose', values)
  }

  public getAnnounceMutedPlayer(): string {
    return this.configuration.getString('announceMutedPlayer', PlayerMuted.DefaultMessage)
  }

  public setAnnounceMutedPlayer(value: string): void {
    this.configuration.setString('announceMutedPlayer', value)
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
