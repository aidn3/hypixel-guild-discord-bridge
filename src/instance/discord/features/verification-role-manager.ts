import type { Client, Guild, GuildMember, Role } from 'discord.js'
import { DiscordAPIError } from 'discord.js'
import type { Guild as HypixelGuild, Player, SkyblockV2Member } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'

import type { LevelRole, VerificationConfig } from '../../../application-config.js'
import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import { formatNumber } from '../../../common/helper-functions.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import Duration from '../../../utility/duration'
import { setIntervalAsync } from '../../../utility/scheduling'
import type DiscordInstance from '../discord-instance.js'

const RoleSyncReason = 'Verification role sync'
const NicknameSyncReason = 'Verification nickname sync'
const MaxNicknameLength = 32

type StatsMap = Record<string, string | number>

interface UpdateSummary {
  updatedGuilds: number
  rolesAdded: number
  rolesRemoved: number
  nicknamesUpdated: number
}

type UpdateAllSummary = UpdateSummary & {
  updatedUsers: number
  failedUsers: number
}

export default class VerificationRoleManager extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  private static readonly DefaultUpdateIntervalHours = 24

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    const config = this.application.getVerificationConfig()
    if (config?.autoRoleUpdater?.enabled) {
      const interval = VerificationRoleManager.resolveUpdateInterval(config)
      setIntervalAsync(() => this.updateAll(), {
        delay: interval,
        errorHandler: this.errorHandler.promiseCatch('updating verification roles for all users')
      })
    }
  }

  override registerEvents(client: Client): void {
    client.on('clientReady', () => {
      const config = this.application.getVerificationConfig()
      if (!config?.autoRoleUpdater?.enabled) return

      void this.updateAll().catch(this.errorHandler.promiseCatch('updating verification roles for all users'))
    })
  }

  public async updateUser(
    discordId: string,
    options: {
      uuid?: string
      guild?: Guild
      hypixelGuild?: HypixelGuild
    } = {}
  ): Promise<UpdateSummary> {
    const config = this.application.getVerificationConfig()
    if (!config) return emptyUpdateSummary()

    const client = this.clientInstance.getClient()
    if (!client.isReady()) {
      this.logger.warn('Verification role update skipped: Discord client is not ready.')
      return emptyUpdateSummary()
    }

    const link = options.uuid
      ? { discordId: discordId, uuid: options.uuid }
      : await this.application.core.verification.findByDiscord(discordId)
    const uuid = link?.uuid

    const guilds = options.guild ? [options.guild] : [...client.guilds.cache.values()]
    if (guilds.length === 0) {
      this.logger.warn('Verification role update skipped: no guilds are available.')
      return emptyUpdateSummary()
    }

    let stats: StatsMap | undefined
    let isGuildMember = false
    let guildRank = ''
    let guildName = ''

    if (uuid) {
      const [player, skyblockMember, hypixelGuild] = await Promise.all([
        this.application.hypixelApi.getPlayer(uuid).catch(() => undefined),
        this.fetchSkyblockMember(uuid),
        options.hypixelGuild ?? this.fetchHypixelGuild()
      ])

      if (!player) {
        throw new Error(`Failed to fetch Hypixel stats for uuid ${uuid}`)
      }

      const guildMember = hypixelGuild?.members.find((member) => member.uuid === uuid)
      isGuildMember = guildMember !== undefined
      guildRank = guildMember?.rank ?? ''
      guildName = hypixelGuild?.name ?? ''

      stats = this.buildStats(player, skyblockMember, guildRank, guildName)
    }

    const summary = emptyUpdateSummary()

    for (const guild of guilds) {
      const member = await this.fetchMember(guild, discordId)
      if (!member) continue

      const memberSummary = await this.updateMember(member, config, {
        linked: uuid !== undefined,
        stats: stats,
        isGuildMember: isGuildMember
      })

      if (memberSummary.updatedGuilds > 0) {
        summary.updatedGuilds += memberSummary.updatedGuilds
        summary.rolesAdded += memberSummary.rolesAdded
        summary.rolesRemoved += memberSummary.rolesRemoved
        summary.nicknamesUpdated += memberSummary.nicknamesUpdated
      }
    }

    return summary
  }

  public async updateAll(options: { guild?: Guild } = {}): Promise<UpdateAllSummary> {
    const config = this.application.getVerificationConfig()
    if (!config) return { ...emptyUpdateSummary(), updatedUsers: 0, failedUsers: 0 }

    const links = this.application.core.verification.getAllLinks()
    if (links.length === 0) return { ...emptyUpdateSummary(), updatedUsers: 0, failedUsers: 0 }

    const hypixelGuild = await this.fetchHypixelGuild()

    const summary: UpdateAllSummary = {
      ...emptyUpdateSummary(),
      updatedUsers: 0,
      failedUsers: 0
    }

    for (const link of links) {
      try {
        const result = await this.updateUser(link.discordId, {
          uuid: link.uuid,
          guild: options.guild,
          hypixelGuild: hypixelGuild
        })
        summary.updatedUsers += 1
        summary.updatedGuilds += result.updatedGuilds
        summary.rolesAdded += result.rolesAdded
        summary.rolesRemoved += result.rolesRemoved
        summary.nicknamesUpdated += result.nicknamesUpdated
      } catch (error: unknown) {
        summary.failedUsers += 1
        this.logger.error(`Failed to update verification roles for ${link.discordId}`, error)
      }
    }

    return summary
  }

  private static resolveUpdateInterval(config: VerificationConfig): Duration {
    const intervalHours = config.autoRoleUpdater.interval
    if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
      return Duration.hours(VerificationRoleManager.DefaultUpdateIntervalHours)
    }

    return Duration.hours(intervalHours)
  }

  private async fetchHypixelGuild(): Promise<HypixelGuild | undefined> {
    const bots = this.application.minecraftManager.getMinecraftBots()
    if (bots.length === 0) {
      this.logger.warn('Verification role update skipped guild lookup: no Minecraft bots are connected.')
      return undefined
    }

    const selectedBot = bots[0]
    try {
      return await this.application.hypixelApi.getGuild('player', selectedBot.uuid)
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch Hypixel guild for bot ${selectedBot.username}`, error)
      return undefined
    }
  }

  private async fetchSkyblockMember(uuid: string): Promise<SkyblockV2Member | undefined> {
    try {
      const response = await this.application.hypixelApi.getSkyblockProfiles(uuid, { raw: true })
      if (!response.profiles) return undefined
      const profile = response.profiles.find((entry) => entry.selected)
      return profile?.members[uuid]
    } catch (error: unknown) {
      this.logger.warn(`Failed to fetch Skyblock profile for ${uuid}`, error)
      return undefined
    }
  }

  private buildStats(
    player: Player,
    skyblockMember: SkyblockV2Member | undefined,
    guildRank: string,
    guildName: string
  ): StatsMap {
    const skyblockExperience = skyblockMember?.leveling?.experience ?? 0
    const skyblockLevel = skyblockExperience > 0 ? skyblockExperience / 100 : 0
    const bedwarsStats = player.stats?.bedwars
    const skywarsStats = player.stats?.skywars
    const duelsStats = player.stats?.duels

    return {
      username: player.nickname ?? '',
      guildRank: guildRank,
      guildName: guildName,

      hypixelLevel: player.level ?? 0,
      achievementPoints: player.achievementPoints ?? 0,
      karma: player.karma ?? 0,

      bedwarsStar: bedwarsStats?.level ?? 0,
      bedwarsFinalKills: bedwarsStats?.finalKills ?? 0,
      bedwarsWins: bedwarsStats?.wins ?? 0,
      bedwarsWLRatio: bedwarsStats?.WLRatio ?? 0,

      skywarsLevel: skywarsStats?.level ?? 0,
      skywarsWins: skywarsStats?.wins ?? 0,
      skywarsWLRatio: skywarsStats?.WLRatio ?? 0,

      duelsTitle: duelsStats?.title ?? '',
      duelsWins: duelsStats?.wins ?? 0,
      duelsWLRatio: duelsStats?.WLRatio ?? 0,

      skyblockLevel: skyblockLevel
    }
  }

  private async fetchMember(guild: Guild, discordId: string): Promise<GuildMember | undefined> {
    try {
      return await guild.members.fetch(discordId)
    } catch {
      return undefined
    }
  }

  private async updateMember(
    member: GuildMember,
    config: VerificationConfig,
    options: { linked: boolean; stats?: StatsMap; isGuildMember: boolean }
  ): Promise<UpdateSummary> {
    if (!member.manageable) {
      this.logger.warn(`Skipping verification role update: cannot manage member ${member.id} in ${member.guild.id}`)
      return emptyUpdateSummary()
    }

    const managedRoleIds = this.collectManagedRoleIds(config)
    const desiredRoleIds =
      options.linked && options.stats
        ? this.resolveDesiredRoles(config, options.stats, options.isGuildMember)
        : new Set<string>()

    const currentRoles = new Set(member.roles.cache.keys())
    const toAdd = [...desiredRoleIds].filter((roleId) => !currentRoles.has(roleId))
    const toRemove = managedRoleIds.filter((roleId) => currentRoles.has(roleId) && !desiredRoleIds.has(roleId))

    const summary: UpdateSummary = {
      updatedGuilds: 1,
      rolesAdded: 0,
      rolesRemoved: 0,
      nicknamesUpdated: 0
    }

    if (toAdd.length > 0) {
      const editableToAdd = await this.filterEditableRoles(member.guild, toAdd)
      if (editableToAdd.length > 0) {
        try {
          await member.roles.add(editableToAdd, RoleSyncReason)
          summary.rolesAdded += editableToAdd.length
        } catch (error: unknown) {
          this.logDiscordError(`Failed to add roles for ${member.id}`, error)
        }
      }
    }

    if (toRemove.length > 0) {
      const editableToRemove = await this.filterEditableRoles(member.guild, toRemove)
      if (editableToRemove.length > 0) {
        try {
          await member.roles.remove(editableToRemove, RoleSyncReason)
          summary.rolesRemoved += editableToRemove.length
        } catch (error: unknown) {
          this.logDiscordError(`Failed to remove roles for ${member.id}`, error)
        }
      }
    }

    const nicknameChanged = await this.updateNickname(member, config, options)
    if (nicknameChanged) summary.nicknamesUpdated += 1

    return summary
  }

  private async updateNickname(
    member: GuildMember,
    config: VerificationConfig,
    options: { linked: boolean; stats?: StatsMap; isGuildMember: boolean }
  ): Promise<boolean> {
    if (!config.nickname) return false

    if (!options.linked) {
      if (member.nickname === null) return false

      try {
        await member.setNickname(null, NicknameSyncReason)
        return true
      } catch (error: unknown) {
        this.logDiscordError(`Failed to reset nickname for ${member.id}`, error)
        return false
      }
    }

    if (!options.stats) return false

    const variables = this.buildNicknameVariables(member, options.stats)
    const formatted = this.replaceVariables(config.nickname, variables)
    const trimmed = this.truncateNickname(formatted)
    if (trimmed.length === 0 || member.nickname === trimmed) return false

    try {
      await member.setNickname(trimmed, NicknameSyncReason)
      return true
    } catch (error: unknown) {
      this.logDiscordError(`Failed to update nickname for ${member.id}`, error)
      return false
    }
  }

  private buildNicknameVariables(member: GuildMember, stats: StatsMap): StatsMap {
    return {
      ...stats,
      discordUsername: member.user.username,
      discordDisplayName: member.displayName
    }
  }

  private resolveDesiredRoles(config: VerificationConfig, stats: StatsMap, isGuildMember: boolean): Set<string> {
    const desired = new Set<string>()

    if (config.roles.verified.enabled && config.roles.verified.roleId) {
      desired.add(config.roles.verified.roleId)
    }

    if (config.roles.guildMember.enabled && config.roles.guildMember.roleId && isGuildMember) {
      desired.add(config.roles.guildMember.roleId)
    }

    for (const role of config.roles.custom) {
      if (!role.roleId) continue
      if (this.meetsRequirement(role, stats)) desired.add(role.roleId)
    }

    return desired
  }

  private collectManagedRoleIds(config: VerificationConfig): string[] {
    const roleIds = new Set<string>()
    if (config.roles.verified.enabled && config.roles.verified.roleId) {
      roleIds.add(config.roles.verified.roleId)
    }
    if (config.roles.guildMember.enabled && config.roles.guildMember.roleId) {
      roleIds.add(config.roles.guildMember.roleId)
    }
    for (const role of config.roles.custom) {
      if (role.roleId) roleIds.add(role.roleId)
    }
    return [...roleIds]
  }

  private meetsRequirement(role: LevelRole, stats: StatsMap): boolean {
    const value = stats[role.type]
    if (value === undefined) return false

    if (typeof value === 'number') {
      const requirementNumber =
        typeof role.requirement === 'number' ? role.requirement : Number.parseFloat(role.requirement)
      if (!Number.isFinite(requirementNumber)) return false
      return value >= requirementNumber
    }

    if (typeof value === 'string') {
      if (typeof role.requirement === 'string') {
        return value.toLowerCase() === role.requirement.toLowerCase()
      }
      return value === String(role.requirement)
    }

    return false
  }

  private async filterEditableRoles(guild: Guild, roleIds: string[]): Promise<string[]> {
    const editable: string[] = []
    for (const roleId of roleIds) {
      const role = await this.fetchRole(guild, roleId)
      if (!role) {
        this.logger.warn(`Role ${roleId} was not found in guild ${guild.id}`)
        continue
      }
      if (!role.editable) {
        this.logger.warn(`Missing permissions to manage role ${role.id} in guild ${guild.id}`)
        continue
      }
      editable.push(role.id)
    }
    return editable
  }

  private async fetchRole(guild: Guild, roleId: string): Promise<Role | undefined> {
    const cached = guild.roles.cache.get(roleId)
    if (cached) return cached

    try {
      const role = await guild.roles.fetch(roleId)
      return role ?? undefined
    } catch {
      return undefined
    }
  }

  private replaceVariables(template: string, variables: StatsMap): string {
    const formatted = Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [key, typeof value === 'number' ? formatNumber(value) : value])
    )

    return template.replaceAll(/\{(\w+)\}/g, (match, name) => formatted[name] ?? match)
  }

  private truncateNickname(nickname: string): string {
    return nickname.length > MaxNicknameLength ? nickname.slice(0, MaxNicknameLength) : nickname
  }

  private logDiscordError(message: string, error: unknown): void {
    if (error instanceof DiscordAPIError) {
      this.logger.error(`${message} (code ${error.code}): ${error.message}`)
      return
    }
    this.logger.error(message, error)
  }
}

function emptyUpdateSummary(): UpdateSummary {
  return {
    updatedGuilds: 0,
    rolesAdded: 0,
    rolesRemoved: 0,
    nicknamesUpdated: 0
  }
}
