/* eslint-disable import/no-restricted-paths */
import assert from 'node:assert'

import type { Guild } from 'discord.js'

import type Application from '../application'
import type { ModerationConfig } from '../core/core'
import type { CommandsHeat, HeatResult, HeatType } from '../core/moderation/commands-heat'
import type Punishments from '../core/moderation/punishments'
import type { SavedPunishment } from '../core/moderation/punishments'
import type Duration from '../utility/duration'

import type { BasePunishment, InformEvent, PunishmentPurpose, UserLink } from './application-event'
import { InstanceType, Permission, PunishmentType } from './application-event'
import { Status } from './connectable-instance'

export interface InitializeOptions {
  guild?: Guild
}

export class User {
  public constructor(
    protected readonly application: Application,
    protected readonly context: ManagerContext,
    private readonly userIdentifier: UserIdentifier,
    private readonly userMojang: MojangProfile | undefined,
    private readonly userDiscord: DiscordProfile | undefined,
    private readonly userLink: UserLink | undefined
  ) {
    if (userLink !== undefined && userMojang !== undefined && userDiscord !== undefined) {
      assert.strictEqual(userMojang.id, userLink.uuid)
      assert.strictEqual(userDiscord.id, userLink.discordId)
    }
  }

  public displayName(): string {
    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined) return mojangProfile.name

    const discordProfile = this.discordProfile()
    if (discordProfile !== undefined) return discordProfile.displayName

    return this.getUserIdentifier().userId.slice(0, 16)
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
    return this.userLink !== undefined
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
      if (
        this.context.moderation.immuneMojangPlayers.some(
          (entry) => entry.toLowerCase() === mojangProfile.name.toLowerCase()
        )
      ) {
        return true
      }
    }

    const discordProfile = this.discordProfile()
    // noinspection RedundantIfStatementJS
    if (discordProfile !== undefined && this.context.moderation.immuneDiscordUsers.includes(discordProfile.id)) {
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
    return this.allIdentifiers().some(
      (entry) => entry.originInstance === identifier.originInstance && entry.userId === identifier.userId
    )
  }

  public getUserIdentifier(): UserIdentifier {
    return this.userIdentifier
  }

  public allIdentifiers(): UserIdentifier[] {
    const result: UserIdentifier[] = []

    /**
     * Add an identifier if not already exists in `result`
     * @param identifier the identifier to add
     */
    function add(identifier: UserIdentifier) {
      for (const entry of result) {
        if (identifier.originInstance === entry.originInstance && identifier.userId === entry.userId) {
          return
        }
      }

      result.push(identifier)
    }

    add(this.userIdentifier)
    const mojangProfile = this.mojangProfile()
    if (mojangProfile !== undefined) add({ originInstance: InstanceType.Minecraft, userId: mojangProfile.id })

    const discordProfile = this.discordProfile()
    if (discordProfile !== undefined) add({ originInstance: InstanceType.Discord, userId: discordProfile.id })

    if (this.userLink !== undefined) {
      add({ originInstance: InstanceType.Minecraft, userId: this.userLink.uuid })
      add({ originInstance: InstanceType.Discord, userId: this.userLink.discordId })
    }

    return result
  }

  public punishments(): PunishmentInstant {
    const punishments = this.context.punishments.findByUser(this)
    return new PunishmentInstant(this, punishments)
  }

  public forgive(executor: InformEvent): SavedPunishment[] {
    const savedPunishments = this.context.punishments.remove(this)

    this.application.emit('punishmentForgive', { ...executor, user: this })

    return savedPunishments
  }

  public ban(executor: InformEvent, purpose: PunishmentPurpose, duration: Duration, reason: string): SavedPunishment {
    return this.punish(executor, PunishmentType.Ban, purpose, duration, reason)
  }

  public mute(executor: InformEvent, purpose: PunishmentPurpose, duration: Duration, reason: string): SavedPunishment {
    return this.punish(executor, PunishmentType.Mute, purpose, duration, reason)
  }

  private punish(
    executor: InformEvent,
    type: PunishmentType,
    purpose: PunishmentPurpose,
    duration: Duration,
    reason: string
  ): SavedPunishment {
    const currentTime = Date.now()

    const punishment: BasePunishment = {
      type: type,
      purpose: purpose,
      createdAt: currentTime,
      till: currentTime + duration.toMilliseconds(),
      reason: reason
    }

    const savedPunishment = { ...punishment, ...this.getUserIdentifier() }

    this.context.punishments.add(savedPunishment)
    this.application.emit('punishmentAdd', { ...executor, user: this, ...punishment })

    return savedPunishment
  }

  public addModerationAction(type: HeatType): HeatResult {
    return this.context.commandsHeat.add(this, type)
  }

  public tryAddModerationAction(type: HeatType): HeatResult {
    return this.context.commandsHeat.tryAdd(this, type)
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

export interface ManagerContext {
  commandsHeat: CommandsHeat
  punishments: Punishments
  moderation: DeepReadonly<ModerationConfig>
}
