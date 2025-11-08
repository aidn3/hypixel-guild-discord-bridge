import assert from 'node:assert'

import type Application from '../application'
import { InstanceType } from '../common/application-event'
import { Instance, InternalInstancePrefix } from '../common/instance'
import { SqliteManager } from '../common/sqlite-manager'
import type {
  DiscordProfile,
  DiscordUser,
  InitializeOptions,
  ManagerContext,
  MinecraftUser,
  MojangProfile,
  UserIdentifier
} from '../common/user'
import { User } from '../common/user'

import { ConfigurationsManager } from './configurations'
import { DiscordLeaderboards } from './discord/discord-leaderboards'
import { initializeCoreDatabase } from './initialize-database'
import { MinecraftAccounts } from './minecraft/minecraft-accounts'
import { MinecraftConfigurations } from './minecraft/minecraft-configurations'
import { SessionsManager } from './minecraft/sessions-manager'
import { CommandsHeat } from './moderation/commands-heat'
import { ModerationConfigurations } from './moderation/moderation-configurations'
import { Profanity } from './moderation/profanity'
import type { SavedPunishment } from './moderation/punishments'
import Punishments from './moderation/punishments'
import PunishmentsEnforcer from './moderation/punishments-enforcer'
import Autocomplete from './users/autocomplete'
import { GuildManager } from './users/guild-manager'
import { MojangApi } from './users/mojang'
import ScoresManager from './users/scores-manager'
import { Verification } from './users/verification'

export class Core extends Instance<InstanceType.Core> {
  // moderation
  private readonly commandsHeat: CommandsHeat
  private readonly profanity: Profanity
  private readonly punishments: Punishments
  private readonly enforcer: PunishmentsEnforcer

  // users
  private readonly autoComplete: Autocomplete
  public readonly guildManager: GuildManager
  public readonly mojangApi: MojangApi
  public readonly scoresManager: ScoresManager
  public readonly verification: Verification

  // discord
  public readonly discordLeaderboards: DiscordLeaderboards

  // minecraft
  public readonly minecraftConfigurations: MinecraftConfigurations
  public readonly minecraftSessions: SessionsManager
  public readonly moderationConfiguration: ModerationConfigurations
  public readonly minecraftAccounts: MinecraftAccounts

  // database
  private readonly sqliteManager: SqliteManager
  private readonly configurationsManager: ConfigurationsManager

  public constructor(application: Application) {
    super(application, InternalInstancePrefix + 'core', InstanceType.Core)

    const sqliteName = 'users.sqlite'
    this.sqliteManager = new SqliteManager(application, this.logger, application.getConfigFilePath(sqliteName))
    initializeCoreDatabase(this.application, this.sqliteManager, sqliteName)

    this.discordLeaderboards = new DiscordLeaderboards(this.sqliteManager)

    this.configurationsManager = new ConfigurationsManager(this.sqliteManager)
    this.minecraftConfigurations = new MinecraftConfigurations(this.configurationsManager)
    this.minecraftSessions = new SessionsManager(this.sqliteManager, this.logger)
    this.minecraftAccounts = new MinecraftAccounts(this.sqliteManager)

    this.moderationConfiguration = new ModerationConfigurations(this.configurationsManager)
    this.mojangApi = new MojangApi(this.sqliteManager)

    this.profanity = new Profanity(this.moderationConfiguration)
    this.punishments = new Punishments(this.sqliteManager, application, this.logger)
    this.commandsHeat = new CommandsHeat(this.sqliteManager, this.moderationConfiguration, this.logger)
    this.enforcer = new PunishmentsEnforcer(application, this, this.eventHelper, this.logger, this.errorHandler)

    this.guildManager = new GuildManager(application, this, this.eventHelper, this.logger, this.errorHandler)
    this.autoComplete = new Autocomplete(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.sqliteManager
    )

    this.verification = new Verification(this.sqliteManager)
    this.scoresManager = new ScoresManager(
      application,
      this,
      this.eventHelper,
      this.logger,
      this.errorHandler,
      this.sqliteManager
    )
  }

  public completeUsername(query: string, limit: number): string[] {
    return this.autoComplete.username(query, limit)
  }

  public completeRank(query: string, limit: number): string[] {
    return this.autoComplete.rank(query, limit)
  }

  public filterProfanity(message: string): { filteredMessage: string; changed: boolean } {
    return this.profanity.filterProfanity(message)
  }

  public allPunishments(): SavedPunishment[] {
    return this.punishments.all()
  }

  public async awaitReady(): Promise<void> {
    await this.punishments.ready
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
   * @param context additional information that might help with constructing user metadata
   * @returns a full initialized object that contains user data at the moment of execution
   */
  async initializeDiscordUser(
    profile: DiscordProfile,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: InitializeOptions
  ): Promise<DiscordUser> {
    const identifier: UserIdentifier = { userId: profile.id, originInstance: InstanceType.Discord }

    let mojangProfile: MojangProfile | undefined
    const userLink = await this.application.core.verification.findByDiscord(profile.id)
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
    const identifier: UserIdentifier = { userId: mojangProfile.id, originInstance: InstanceType.Minecraft }

    let profile: DiscordProfile | undefined
    const userLink = await this.application.core.verification.findByIngame(mojangProfile.id)
    if (userLink !== undefined) {
      profile = this.application.discordInstance.profileById(userLink.discordId, context.guild)
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
      case InstanceType.Minecraft: {
        const profile = await this.application.mojangApi.profileByUuid(identifier.userId)
        return this.initializeMinecraftUser(profile, context)
      }
      case InstanceType.Discord: {
        const profile = this.application.discordInstance.profileById(identifier.userId, context.guild)
        if (profile !== undefined) return this.initializeDiscordUser(profile, context)
      }
    }

    // default
    return new User(this.application, this.userContext(), identifier, undefined, undefined, undefined)
  }

  private userContext(): ManagerContext {
    return {
      commandsHeat: this.commandsHeat,
      punishments: this.punishments,
      moderation: this.moderationConfiguration
    }
  }
}
