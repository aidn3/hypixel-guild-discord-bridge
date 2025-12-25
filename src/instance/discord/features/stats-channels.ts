import type { Client, Guild } from 'discord.js'
import { DiscordAPIError, GuildChannel } from 'discord.js'
import type { Guild as HypixelGuild } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'

import type { StatsChannelsConfig } from '../../../application-config.js'
import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import Duration from '../../../utility/duration'
import { setIntervalAsync } from '../../../utility/scheduling'
import type DiscordInstance from '../discord-instance.js'

interface DiscordStats {
  memberCount: number
  channels: number
  roles: number
}

type StatsVariables = Record<string, string>

const ChannelNameReason = 'Updated stats channels'

export default class StatsChannels extends SubInstance<DiscordInstance, InstanceType.Discord, Client> {
  private static readonly DefaultUpdateIntervalMinutes = 5

  private readonly updateInterval: Duration

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.updateInterval = StatsChannels.resolveUpdateInterval(this.application.getStatsChannelsConfig())

    setIntervalAsync(() => this.updateChannels(), {
      delay: this.updateInterval,
      errorHandler: this.errorHandler.promiseCatch('updating stats channels')
    })
  }

  override registerEvents(client: Client): void {
    client.on('clientReady', () => {
      void this.updateChannels().catch(this.errorHandler.promiseCatch('updating stats channels'))
    })
  }

  private static resolveUpdateInterval(config: StatsChannelsConfig | undefined): Duration {
    const intervalMinutes = config?.updateIntervalMinutes ?? StatsChannels.DefaultUpdateIntervalMinutes
    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
      return Duration.minutes(StatsChannels.DefaultUpdateIntervalMinutes)
    }

    return Duration.minutes(intervalMinutes)
  }

  private async updateChannels(): Promise<void> {
    const config = this.application.getStatsChannelsConfig()
    if (!config?.enabled) return
    if (config.channels.length === 0) {
      this.logger.warn('Stats channels enabled but no channels are configured.')
      return
    }

    const client = this.clientInstance.getClient()
    if (!client.isReady()) return

    const hypixelGuild = await this.fetchGuild(config)
    if (!hypixelGuild) return

    const discordStatsCache = new Map<string, DiscordStats>()

    for (const channelInfo of config.channels) {
      let channel
      try {
        channel = await client.channels.fetch(channelInfo.id)
      } catch (error: unknown) {
        this.logger.error(`Failed to fetch stats channel ${channelInfo.id}`, error)
        continue
      }

      if (!channel || !(channel instanceof GuildChannel)) {
        this.logger.warn(`Stats channel ${channelInfo.id} is not a guild channel or no longer exists.`)
        continue
      }

      if (!channel.manageable) {
        this.logger.warn(`Missing permissions to update stats channel ${channelInfo.id}.`)
        continue
      }

      const discordStats = await this.resolveDiscordStats(channel.guild, discordStatsCache)
      const variables = this.buildVariables(hypixelGuild, discordStats)
      const updatedName = replaceVariables(channelInfo.name, variables)

      if (channel.name === updatedName) continue

      try {
        await channel.setName(updatedName, ChannelNameReason)
      } catch (error: unknown) {
        if (error instanceof DiscordAPIError) {
          this.logger.error(
            `Failed to update stats channel ${channelInfo.id} with code ${error.code}: ${error.message}`
          )
          continue
        }
        this.logger.error(`Failed to update stats channel ${channelInfo.id}`, error)
      }
    }
  }

  private async fetchGuild(config: StatsChannelsConfig): Promise<HypixelGuild | undefined> {
    const trimmedGuildName = config.guildName?.trim()
    if (trimmedGuildName) {
      try {
        return await this.application.hypixelApi.getGuild('name', trimmedGuildName)
      } catch (error: unknown) {
        this.logger.error(`Failed to fetch Hypixel guild by name "${trimmedGuildName}"`, error)
        return undefined
      }
    }

    const bots = this.application.minecraftManager.getMinecraftBots()
    if (bots.length === 0) {
      this.logger.warn('Stats channels enabled but no Minecraft bots are connected.')
      return undefined
    }

    let selectedBot = bots[0]
    if (config.minecraftInstance) {
      const requested = config.minecraftInstance.toLowerCase()
      const match = bots.find((bot) => bot.instanceName.toLowerCase() === requested)
      if (match) {
        selectedBot = match
      } else {
        this.logger.warn(
          `Stats channels configured for minecraftInstance "${config.minecraftInstance}" but no matching bot was found.`
        )
      }
    }

    try {
      return await this.application.hypixelApi.getGuild('player', selectedBot.uuid)
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch Hypixel guild for bot ${selectedBot.username}`, error)
      return undefined
    }
  }

  private async resolveDiscordStats(guild: Guild, cache: Map<string, DiscordStats>): Promise<DiscordStats> {
    const cached = cache.get(guild.id)
    if (cached) return cached

    let channelsCount = guild.channels.cache.size
    let rolesCount = guild.roles.cache.size

    try {
      const [channels, roles] = await Promise.all([guild.channels.fetch(), guild.roles.fetch()])
      channelsCount = channels.size
      rolesCount = roles.size
    } catch (error: unknown) {
      this.logger.warn(`Failed to fetch channels or roles for guild ${guild.id}, using cached counts.`)
      this.logger.error(error)
    }

    const stats = {
      memberCount: guild.memberCount,
      channels: channelsCount,
      roles: rolesCount
    }

    cache.set(guild.id, stats)
    return stats
  }

  private buildVariables(hypixelGuild: HypixelGuild, discordStats: DiscordStats): StatsVariables {
    return {
      guildName: hypixelGuild.name,
      guildLevel: Math.floor(hypixelGuild.level).toString(),
      guildLevelWithProgress: hypixelGuild.level.toFixed(2),
      guildXP: hypixelGuild.experience.toLocaleString(),
      guildWeeklyXP: hypixelGuild.totalWeeklyGexp.toLocaleString(),
      guildMembers: hypixelGuild.members.length.toLocaleString(),
      discordMembers: discordStats.memberCount.toLocaleString(),
      discordChannels: discordStats.channels.toLocaleString(),
      discordRoles: discordStats.roles.toLocaleString()
    }
  }
}

function replaceVariables(template: string, variables: StatsVariables): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, name) => variables[name] ?? match)
}
