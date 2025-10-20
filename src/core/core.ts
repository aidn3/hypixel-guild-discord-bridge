import assert from 'node:assert'

import type Application from '../application'
import { InstanceType, LinkType } from '../common/application-event'
import { ConfigManager } from '../common/config-manager'
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

import { initializeCoreDatabase } from './initialize-database'
import { CommandsHeat } from './moderation/commands-heat'
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
  private readonly commandsHeat: CommandsHeat
  private readonly profanity: Profanity
  private readonly punishments: Punishments
  private readonly enforcer: PunishmentsEnforcer

  private readonly autoComplete: Autocomplete
  public readonly guildManager: GuildManager
  public readonly mojangApi: MojangApi
  public readonly scoresManager: ScoresManager
  public readonly verification: Verification

  private readonly sqliteManager: SqliteManager
  private readonly moderationConfig: ConfigManager<ModerationConfig>

  public constructor(application: Application) {
    super(application, InternalInstancePrefix + 'core', InstanceType.Core)

    this.moderationConfig = new ConfigManager(
      application,
      this.logger,
      application.getConfigFilePath('moderation.json'),
      {
        heatPunishment: true,
        mutesPerDay: 10,
        kicksPerDay: 5,

        immuneDiscordUsers: [],
        immuneMojangPlayers: [],

        profanityEnabled: true,
        profanityWhitelist: ['sadist', 'hell', 'damn', 'god', 'shit', 'balls', 'retard'],
        profanityBlacklist: []
      }
    )

    const sqliteName = 'users.sqlite'
    this.sqliteManager = new SqliteManager(application, this.logger, application.getConfigFilePath(sqliteName))
    initializeCoreDatabase(this.sqliteManager, sqliteName)

    this.mojangApi = new MojangApi(this.sqliteManager)

    this.profanity = new Profanity(this.moderationConfig)
    this.punishments = new Punishments(this.sqliteManager, application, this.logger)
    this.commandsHeat = new CommandsHeat(this.sqliteManager, application, this.moderationConfig, this.logger)
    this.enforcer = new PunishmentsEnforcer(application, this, this.eventHelper, this.logger, this.errorHandler)

    this.guildManager = new GuildManager(application, this, this.eventHelper, this.logger, this.errorHandler)
    this.autoComplete = new Autocomplete(application, this, this.eventHelper, this.logger, this.errorHandler)

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

  public completeUsername(query: string): string[] {
    return this.autoComplete.username(query)
  }

  public completeRank(query: string): string[] {
    return this.autoComplete.rank(query)
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
  public getModerationConfig(): ConfigManager<ModerationConfig> {
    return this.moderationConfig
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
    const verification = await this.application.core.verification.findByDiscord(profile.id)
    if (verification.type === LinkType.Confirmed) {
      mojangProfile = await this.application.mojangApi.profileByUuid(verification.link.uuid)
    }

    const user = new User(this.application, this.userContext(), identifier, mojangProfile, profile, verification)
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
    const verification = await this.application.core.verification.findByIngame(mojangProfile.id)
    if (verification.type === LinkType.Confirmed) {
      profile = this.application.discordInstance.profileById(verification.link.discordId, context.guild)
    }

    const user = new User(this.application, this.userContext(), identifier, mojangProfile, profile, verification)
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
    return new User(this.application, this.userContext(), identifier, undefined, undefined, { type: LinkType.None })
  }

  private userContext(): ManagerContext {
    return {
      commandsHeat: this.commandsHeat,
      punishments: this.punishments,
      moderation: this.moderationConfig.data
    }
  }
}

export interface ModerationConfig {
  heatPunishment: boolean
  mutesPerDay: number
  kicksPerDay: number

  immuneDiscordUsers: string[]
  immuneMojangPlayers: string[]

  profanityEnabled: boolean
  profanityWhitelist: string[]
  profanityBlacklist: string[]
}
