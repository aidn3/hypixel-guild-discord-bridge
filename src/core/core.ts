/*
 * Credit WildWolfsblut <https://github.com/WildWolfsblut>
 * for helping with ./src/core design and structure
 */
import assert from 'node:assert'

import Logger from 'log4js'

import type Application from '../application.js'
import { Platform } from '../common/application-event.js'
import { Instance } from '../common/instance.js'
import { SqliteManager } from '../common/sqlite-manager.js'
import type {
  DiscordProfile,
  DiscordUser,
  InitializeOptions,
  ManagerContext,
  MinecraftUser,
  MojangProfile,
  UserIdentifier
} from '../common/user.js'
import { User } from '../common/user.js'

import { AdminConfigurations } from './admin-configurations.js'
import { ApplicationConfigurations } from './application-configurations.js'
import { ConditionsRegistry } from './conditions/conditions-registry.js'
import { ConfigurationsManager } from './configurations.js'
import { DiscordConfigurations } from './discord/discord-configurations.js'
import { DiscordEmojis } from './discord/discord-emojis.js'
import { DiscordLeaderboards } from './discord/discord-leaderboards.js'
import { DiscordTemporarilyInteractions } from './discord/discord-temporarily-interactions.js'
import { DiscordUserMessage } from './discord/discord-user-message.js'
import { DiscordLinkButton } from './discord/link-button.js'
import { UserConditions } from './discord/user-conditions.js'
import { Hypixel } from './hypixel/hypixel.js'
import { initializeHypixelDatabase } from './hypixel/initialize-hypixel.js'
import { initializeCoreDatabase } from './initialize-database.js'
import { LanguageConfigurations } from './language-configurations.js'
import { MigrationConfigurations } from './migration-configurations.js'
import { MinecraftAccounts } from './minecraft/minecraft-accounts.js'
import { MinecraftConfigurations } from './minecraft/minecraft-configurations.js'
import { SessionsManager } from './minecraft/sessions-manager.js'
import { CommandsHeat } from './moderation/commands-heat.js'
import { ModerationConfigurations } from './moderation/moderation-configurations.js'
import { Profanity } from './moderation/profanity.js'
import type { SavedPunishment } from './moderation/punishments.js'
import Punishments from './moderation/punishments.js'
import { PlaceholderManager } from './placeholder/placeholder-manager.js'
import { SpontaneousEventsConfigurations } from './spontanmous-events-configurations.js'
import { Urchin } from './urchin/urchin.js'
import Autocomplete from './users/autocomplete.js'
import { MojangApi } from './users/mojang.js'
import ScoresManager from './users/scores-manager.js'
import { Verification } from './users/verification.js'
import { Users } from './users.js'

export class Core extends Instance {
  // moderation
  private readonly commandsHeat: CommandsHeat
  public readonly profanity: Profanity
  private readonly punishments: Punishments

  // users
  public readonly users: Users
  private readonly autoComplete: Autocomplete
  public readonly mojangApi: MojangApi
  public readonly scoresManager: ScoresManager
  public readonly verification: Verification

  // discord
  public readonly discordConfigurations: DiscordConfigurations
  public readonly discordLeaderboards: DiscordLeaderboards
  public readonly discordTemporarilyInteractions: DiscordTemporarilyInteractions
  public readonly discordLinkButton: DiscordLinkButton
  public readonly discordUserMessage: DiscordUserMessage
  public readonly discordEmojis: DiscordEmojis
  public readonly discordUserConditions: UserConditions

  // minecraft
  public readonly minecraftConfigurations: MinecraftConfigurations
  public readonly minecraftSessions: SessionsManager
  public readonly moderationConfiguration: ModerationConfigurations
  public readonly minecraftAccounts: MinecraftAccounts

  // misc
  public readonly applicationConfigurations: ApplicationConfigurations
  public readonly migrationConfigurations: MigrationConfigurations
  public readonly languageConfigurations: LanguageConfigurations
  public readonly adminConfigurations: AdminConfigurations
  public readonly spontaneousEventsConfigurations: SpontaneousEventsConfigurations
  public readonly hypixelApi: Hypixel
  public readonly urchinApi: Urchin | undefined
  public readonly conditonsRegistry: ConditionsRegistry
  public readonly placeHolder: PlaceholderManager

  // database
  private readonly sqliteManager: SqliteManager
  private readonly hypixelManager: SqliteManager
  private readonly configurationsManager: ConfigurationsManager

  public constructor(application: Application, hypixelApiKey: string, urchinApiKey: string | undefined) {
    super(application, 'core')

    this.conditonsRegistry = new ConditionsRegistry()

    const sqliteName = 'users.sqlite'
    this.sqliteManager = new SqliteManager(
      application,
      this.logger,
      application.memoryOnly ? undefined : application.getConfigFilePath(sqliteName)
    )
    initializeCoreDatabase(this.application, this.sqliteManager, sqliteName)

    const hypixelName = 'hypixel.sqlite'
    this.hypixelManager = new SqliteManager(
      application,
      Logger.getLogger('Hypixel-API'),
      application.memoryOnly ? undefined : application.getConfigFilePath(hypixelName)
    )
    initializeHypixelDatabase(this.hypixelManager, hypixelName)

    this.configurationsManager = new ConfigurationsManager(this.sqliteManager)
    this.migrationConfigurations = new MigrationConfigurations(this.configurationsManager)
    this.users = new Users(this.sqliteManager)

    this.discordConfigurations = new DiscordConfigurations(this.configurationsManager)
    this.discordLeaderboards = new DiscordLeaderboards(this.sqliteManager)
    this.discordTemporarilyInteractions = new DiscordTemporarilyInteractions(
      this.sqliteManager,
      this.discordConfigurations
    )
    this.discordLinkButton = new DiscordLinkButton(this.sqliteManager)
    this.discordUserMessage = new DiscordUserMessage(this.sqliteManager, this.users)
    this.discordEmojis = new DiscordEmojis(this.sqliteManager)
    this.discordUserConditions = new UserConditions(this.sqliteManager)

    this.placeHolder = new PlaceholderManager()

    this.applicationConfigurations = new ApplicationConfigurations(this.configurationsManager)
    this.languageConfigurations = new LanguageConfigurations(this.configurationsManager)
    this.adminConfigurations = new AdminConfigurations(this.configurationsManager)
    this.spontaneousEventsConfigurations = new SpontaneousEventsConfigurations(this.configurationsManager)

    this.minecraftConfigurations = new MinecraftConfigurations(this.configurationsManager)
    this.minecraftSessions = new SessionsManager(this.sqliteManager, this.logger)
    this.minecraftAccounts = new MinecraftAccounts(this.sqliteManager)

    this.moderationConfiguration = new ModerationConfigurations(this.configurationsManager)
    this.mojangApi = new MojangApi(this.sqliteManager)
    this.hypixelApi = new Hypixel(hypixelApiKey, this.hypixelManager, this.logger)
    this.urchinApi = urchinApiKey === undefined ? undefined : new Urchin(urchinApiKey, this.logger)

    this.profanity = new Profanity(this.sqliteManager, this.moderationConfiguration)
    this.punishments = new Punishments(this.sqliteManager, application, this.logger)
    this.commandsHeat = new CommandsHeat(this.sqliteManager, this.moderationConfiguration, this.logger)

    this.autoComplete = new Autocomplete(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.sqliteManager,
      this.abortController.signal
    )

    this.verification = new Verification(this.sqliteManager, this.users)
    this.scoresManager = new ScoresManager(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.sqliteManager,
      this.abortController.signal
    )
  }

  public completeUsername(query: string, limit: number): string[] {
    return this.autoComplete.username(query, limit)
  }

  public filterProfanity(message: string): { filteredMessage: string; changed: boolean } {
    return this.profanity.filterProfanity(message)
  }

  public allPunishments(
    onlyActive: boolean,
    offset: number,
    limit: number
  ): { page: SavedPunishment[]; total: number } {
    return this.punishments.all(onlyActive, offset, limit)
  }

  public getPunishmentById(id: SavedPunishment['id']): SavedPunishment | undefined {
    return this.punishments.get(id)
  }

  /*
   * @internal Use only for creation of instances or other code that manages its own data
   */
  public getSqliteManager(): SqliteManager {
    return this.sqliteManager
  }

  /*
   * @internal Use only for creation of instances or other code that manages its own data
   */
  public getConfigurationsManager(): ConfigurationsManager {
    return this.configurationsManager
  }

  public editPunishment(
    id: SavedPunishment['id'],
    reason: SavedPunishment['reason'] | undefined,
    till: SavedPunishment['till'] | undefined
  ): SavedPunishment | undefined {
    return this.punishments.edit(id, reason, till)
  }

  public awaitReady(): void {
    this.sqliteManager.clean()
    this.sqliteManager.optimize()

    this.hypixelManager.clean()
    this.hypixelManager.optimize()
  }

  /**
   * @internal Only used by the config managers
   */
  public reloadProfanity(): void {
    this.profanity.reloadProfanity()
  }

  /**
   * Initialize a user based on a given profile and load all metadata in advance
   * @param profile Profile to base the user on
   * @returns a full initialized object that contains user data at the moment of execution
   */
  async initializeDiscordUser(profile: DiscordProfile): Promise<DiscordUser> {
    const identifier: UserIdentifier = { userId: profile.id, originInstance: Platform.Discord }

    let mojangProfile: MojangProfile | undefined
    const userLink = await this.verification.findByDiscord(profile.id)
    if (userLink !== undefined) {
      mojangProfile = await this.application.mojangApi.profileByUuid(userLink.uuid)
    }

    const user = new User(this.application, this.userContext(), identifier, mojangProfile, profile, userLink)
    assert.ok(user.isDiscordUser())
    return user
  }

  /**
   * Initialize a user based on a given profile and load all metadata in advance
   * @param mojangProfile Profile to base the user on
   * @param context additional information that might help with constructing user metadata
   * @returns a full initialized object that contains user data at the moment of execution
   */
  async initializeMinecraftUser(mojangProfile: MojangProfile, context: InitializeOptions): Promise<MinecraftUser> {
    const identifier: UserIdentifier = { userId: mojangProfile.id, originInstance: Platform.Minecraft }

    let profile: DiscordProfile | undefined
    const userLink = await this.application.core.verification.findByIngame(mojangProfile.id)
    if (userLink !== undefined) {
      profile = await this.application.discordInstance.profileById(userLink.discordId, context.guild)
    }

    const user = new User(this.application, this.userContext(), identifier, mojangProfile, profile, userLink)
    assert.ok(user.isMojangUser())
    return user
  }

  /**
   * Initialize a user based on a given data and load all metadata in advance
   * @param identifier most basic data to identify a unique user
   * @param context additional information that might help with constructing user metadata
   * @returns a full initialized object that contains user data at the moment of execution
   */
  async initializeUser(identifier: UserIdentifier, context: InitializeOptions): Promise<User> {
    switch (identifier.originInstance) {
      case Platform.Minecraft: {
        const profile = await this.application.mojangApi.profileByUuid(identifier.userId)
        return this.initializeMinecraftUser(profile, context)
      }
      case Platform.Discord: {
        const profile = await this.application.discordInstance.profileById(identifier.userId, context.guild)
        if (profile !== undefined) return this.initializeDiscordUser(profile)
      }
    }

    // default
    return new User(this.application, this.userContext(), identifier, undefined, undefined, undefined)
  }

  public discordMessagesDeleted(messagesIds: string[]): void {
    const database = this.sqliteManager.getDatabase()
    const transaction = database.transaction(() => {
      this.discordLeaderboards.remove(messagesIds)
      this.discordTemporarilyInteractions.remove(messagesIds)
      this.discordLinkButton.remove(messagesIds)
      this.discordUserMessage.remove(messagesIds)
    })

    transaction()
  }

  private userContext(): ManagerContext {
    return {
      commandsHeat: this.commandsHeat,
      punishments: this.punishments,
      moderation: this.moderationConfiguration
    }
  }
}
