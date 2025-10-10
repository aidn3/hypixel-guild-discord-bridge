/* eslint-disable import/no-restricted-paths */
import assert from 'node:assert'

import type { Guild } from 'discord.js'

import type Application from '../application'
import type { HeatResult, HeatType } from '../instance/moderation/commands-heat'
import type { SavedPunishment } from '../instance/moderation/punishments'
import type Duration from '../utility/duration'

import type { BasePunishment, InformEvent, Link } from './application-event'
import { InstanceType, LinkType, Permission, PunishmentType } from './application-event'
import { Status } from './connectable-instance'

/**
 * Initialize a user based on a given profile and load all metadata in advance
 * @param application Application main instance
 * @param profile Profile to base the user on
 * @param context additional information that might help with constructing user metadata
 * @returns a full initialized object that contains user data at the moment of execution
 */
export async function initializeDiscordUser(
  application: Application,
  profile: DiscordProfile,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: InitializeOptions
): Promise<DiscordUser> {
  const identifier: UserIdentifier = { userId: profile.id, originInstance: InstanceType.Discord }

  let mojangProfile: MojangProfile | undefined
  const verification = await application.usersManager.verification.findByDiscord(profile.id)
  if (verification.type === LinkType.Confirmed) {
    mojangProfile = await application.mojangApi.profileByUuid(verification.link.uuid)
  }

  const user = new User(application, identifier, mojangProfile, profile, verification)
  assert.ok(user.isDiscordUser())
  return user
}

/**
 * Initialize a user based on a given profile and load all metadata in advance
 * @param application Application main instance
 * @param mojangProfile Profile to base the user on
 * @param context additional information that might help with constructing user metadata
 * @returns a full initialized object that contains user data at the moment of execution
 */
export async function initializeMinecraftUser(
  application: Application,
  mojangProfile: MojangProfile,
  context: InitializeOptions
): Promise<MinecraftUser> {
  const identifier: UserIdentifier = { userId: mojangProfile.id, originInstance: InstanceType.Minecraft }

  let profile: DiscordProfile | undefined
  const verification = await application.usersManager.verification.findByIngame(mojangProfile.id)
  if (verification.type === LinkType.Confirmed) {
    profile = application.discordInstance.profileById(verification.link.discordId, context.guild)
  }

  const user = new User(application, identifier, mojangProfile, profile, verification)
  assert.ok(user.isMojangUser())
  return user
}

/**
 * Initialize a user based on a given data and load all metadata in advance
 * @param application Application main instance
 * @param identifier most basic data to identify a unique user
 * @param context additional information that might help with constructing user metadata
 * @returns a full initialized object that contains user data at the moment of execution
 */
export async function initializeUser(
  application: Application,
  identifier: UserIdentifier,
  context: InitializeOptions
): Promise<User> {
  switch (identifier.originInstance) {
    case InstanceType.Minecraft: {
      const profile = await application.mojangApi.profileByUuid(identifier.userId)
      return initializeMinecraftUser(application, profile, context)
    }
    case InstanceType.Discord: {
      const profile = application.discordInstance.profileById(identifier.userId, context.guild)
      if (profile !== undefined) return initializeDiscordUser(application, profile, context)
    }
  }

  // default
  return new User(application, identifier, undefined, undefined, { type: LinkType.None })
}

export interface InitializeOptions {
  guild?: Guild
}

export class User {
  public constructor(
    protected readonly application: Application,
    private readonly userIdentifier: UserIdentifier,
    private readonly userMojang: MojangProfile | undefined,
    private readonly userDiscord: DiscordProfile | undefined,
    private readonly verification: Link
  ) {
    assert.ok(userMojang !== undefined || userDiscord !== undefined)

    if (
      (verification.type === LinkType.Confirmed || verification.type === LinkType.Inference) &&
      userMojang !== undefined &&
      userDiscord !== undefined
    ) {
      assert.strictEqual(userMojang.id, verification.link.uuid)
      assert.strictEqual(userDiscord.id, verification.link.discordId)
    }
  }

  public displayName(): string {
    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined) return mojangProfile.name

    const discordProfile = this.discordProfile()
    if (discordProfile !== undefined) return discordProfile.displayName

    throw new Error('No way to display name for this user.')
  }

  public avatar(): string | undefined {
    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined) {
      return `https://cravatar.eu/helmavatar/${mojangProfile.id}.png`
    }

    const discordProfile = this.discordProfile()
    if (discordProfile?.avatar !== undefined) {
      return discordProfile.avatar
    }

    return undefined
  }

  public profileLink(): string | undefined {
    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined) {
      return `https://sky.shiiyu.moe/stats/${mojangProfile.id}`
    }

    return undefined
  }

  public mojangProfile(): MojangProfile | undefined {
    return this.userMojang
  }

  public discordProfile(): DiscordProfile | undefined {
    return this.userDiscord
  }

  public permission(): Permission {
    let permission = Permission.Anyone

    const discordProfile = this.discordProfile()
    if (discordProfile !== undefined) {
      const discordInstance = this.application.discordInstance
      if (discordInstance.currentStatus() === Status.Connected) {
        const discordPermission = discordInstance.resolvePermission(discordProfile.id)
        if (discordPermission > permission) permission = discordPermission
      }
    }

    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined) {
      const minecraftManager = this.application.minecraftManager
      if (mojangProfile.name.toLowerCase() === minecraftManager.getConfig().data.adminUsername.toLowerCase()) {
        return Permission.Admin
      }
    }

    return permission
  }

  public verified(): boolean {
    return this.verification.type === LinkType.Confirmed
  }

  public immune(): boolean {
    if (this.permission() === Permission.Admin) return true

    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined) {
      if (this.application.minecraftManager.isMinecraftBot(mojangProfile.name)) {
        return true
      }
      if (
        mojangProfile.name.toLowerCase() ===
        this.application.minecraftManager.getConfig().data.adminUsername.toLowerCase()
      ) {
        return true
      }
      if (this.application.moderation.immuneMinecraft(mojangProfile.name)) {
        return true
      }
    }

    const discordProfile = this.discordProfile()
    // noinspection RedundantIfStatementJS
    if (discordProfile !== undefined && this.application.moderation.immuneDiscord(discordProfile.id)) {
      return true
    }

    return false
  }

  public equalsUser(other: User): boolean {
    const discordProfile = this.discordProfile()
    if (discordProfile !== undefined && other.discordProfile()?.id === discordProfile.id) {
      return true
    }

    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined && other.discordProfile()?.id === mojangProfile.id) {
      return true
    }

    const otherIdentifier = other.getUserIdentifier()
    if (
      this.userIdentifier.originInstance === otherIdentifier.originInstance &&
      this.userIdentifier.userId !== otherIdentifier.userId
    )
      return true

    // Possibly to check displayName() as well but that is too unreliable
    return false
  }

  public equalsIdentifier(identifier: UserIdentifier): boolean {
    if (
      this.userIdentifier.originInstance === identifier.originInstance &&
      this.userIdentifier.userId !== identifier.userId
    )
      return true

    switch (identifier.originInstance) {
      case InstanceType.Discord: {
        const discordProfile = this.discordProfile()
        if (discordProfile !== undefined && identifier.userId === discordProfile.id) return true
        if (this.verification.type === LinkType.Confirmed && this.verification.link.discordId === identifier.userId)
          return true
        break
      }

      case InstanceType.Minecraft: {
        const mojangProfile = this.mojangProfile()
        if (mojangProfile !== undefined && mojangProfile.id !== identifier.userId) return true
        if (this.verification.type === LinkType.Confirmed && this.verification.link.uuid === identifier.userId)
          return true
        break
      }
    }

    return false
  }

  public getUserIdentifier(): UserIdentifier {
    return this.userIdentifier
  }

  public punishments(): PunishmentInstant {
    const punishments = this.application.moderation.punishments.findByUser(this)
    return new PunishmentInstant(this, punishments)
  }

  public forgive(executor: InformEvent): SavedPunishment[] {
    const savedPunishments = this.application.moderation.punishments.remove(this)

    this.application.emit('punishmentForgive', { ...executor, user: this })

    return savedPunishments
  }

  public ban(executor: InformEvent, duration: Duration, reason: string): SavedPunishment {
    return this.punish(executor, PunishmentType.Ban, duration, reason)
  }

  public mute(executor: InformEvent, duration: Duration, reason: string): SavedPunishment {
    return this.punish(executor, PunishmentType.Mute, duration, reason)
  }

  private punish(executor: InformEvent, type: PunishmentType, duration: Duration, reason: string): SavedPunishment {
    const currentTime = Date.now()

    const punishment: BasePunishment = {
      type: type,
      createdAt: currentTime,
      till: currentTime + duration.toMilliseconds(),
      reason: reason
    }

    const savedPunishment = { ...punishment, ...this.getUserIdentifier() }

    this.application.moderation.punishments.add(savedPunishment)
    this.application.emit('punishmentAdd', { ...executor, user: this, ...punishment })

    return savedPunishment
  }

  public addModerationAction(type: HeatType): HeatResult {
    return this.application.moderation.commandsHeat.add(this, type)
  }

  public tryAddModerationAction(type: HeatType): HeatResult {
    return this.application.moderation.commandsHeat.tryAdd(this, type)
  }

  public isMojangUser(): this is MinecraftUser {
    if (this.userIdentifier.originInstance === InstanceType.Minecraft) {
      assert.ok(this.userMojang !== undefined)
      return true
    }

    return false
  }

  public isDiscordUser(): this is DiscordUser {
    if (this.userIdentifier.originInstance === InstanceType.Discord) {
      assert.ok(this.userDiscord !== undefined)
      return true
    }

    return false
  }

  // noinspection JSUnusedGlobalSymbols
  public toJSON(): object {
    return { ...this.userIdentifier }
  }
}

export interface MinecraftUser extends User {
  mojangProfile(): MojangProfile

  avatar(): string

  profileLink(): string
}

export interface DiscordUser extends User {
  discordProfile(): DiscordProfile

  avatar(): string

  profileLink(): string
}

export interface DiscordProfile {
  id: string
  displayName: string
  avatar: string | undefined
}

export interface MojangProfile {
  id: string
  name: string
}

export class PunishmentInstant {
  constructor(
    private readonly user: User,
    private readonly punishments: SavedPunishment[]
  ) {}

  public all(): SavedPunishment[] {
    return this.punishments
  }

  public longestPunishment(type: PunishmentType): SavedPunishment | undefined {
    const punishments = this.all()

    let longestPunishment: SavedPunishment | undefined = undefined
    for (const punishment of punishments) {
      if (punishment.type !== type) continue

      if (longestPunishment === undefined || punishment.till > longestPunishment.till) {
        longestPunishment = punishment
      }
    }

    return longestPunishment
  }

  public punishedTill(type: PunishmentType): number | undefined {
    return this.longestPunishment(type)?.till
  }
}

export interface UserIdentifier {
  /**
   * The target of the punishment.
   * Where the {@link #userId} resides and how the {@link #userId} should be interpreted.
   */
  readonly originInstance: InstanceType
  /**
   * User unique Identifier within the {@link #originInstance}.
   * It can be Mojang UUID, or Discord user ID, etc.
   */
  readonly userId: string
}
