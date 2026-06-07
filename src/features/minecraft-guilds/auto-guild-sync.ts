import assert from 'node:assert'

import type { Logger } from 'log4js'
import type { Client } from 'minecraft-protocol'
import type PromiseQueue from 'promise-queue'

import type Application from '../../application'
import { MinecraftSendChatPriority } from '../../common/application-event'
import type EventHelper from '../../common/event-helper'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import type { HypixelGuild } from '../../core/hypixel/hypixel-guild'
import type MinecraftInstance from '../../instance/minecraft/minecraft-instance'
import Duration from '../../utility/duration'
import { setIntervalAsync } from '../../utility/scheduling'

import { resolveGuildRank } from './commands/utlity'
import type { Database, MinecraftGuild } from './database'
import type { MinecraftGuildsManager } from './minecraft-guilds-manager'

export class AutoGuildSync extends SubInstance<MinecraftGuildsManager, Client> {
  private static readonly AutoUpdateRoleEvery = Duration.days(3)

  constructor(
    application: Application,
    clientInstance: MinecraftGuildsManager,
    eventHelper: EventHelper<MinecraftGuildsManager>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    abortSignal: AbortSignal,
    private readonly database: Database,
    private readonly queue: PromiseQueue
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler, abortSignal)

    setIntervalAsync(() => this.queue.add(() => this.updateGuild()), {
      errorHandler: this.errorHandler.promiseCatch('updating in-game guild data'),
      delay: Duration.hours(3),
      abortSignal: this.abortSignal
    })
  }

  private async updateGuild(): Promise<void> {
    const savedGuilds = this.database.allGuilds()

    for (const savedGuild of savedGuilds) {
      this.logger.debug(`Updating name=${savedGuild.name},id=${savedGuild.id} guild data`)

      const instance = await this.findInstance(savedGuild)
      if (instance === undefined) {
        this.logger.warn(
          'Can not proceed with updating this guild since no active Minecraft instance is avilable to execute any commands'
        )
        continue
      }

      const guild = await this.application.hypixelApi.getGuildById(savedGuild.id)
      if (guild === undefined) {
        this.logger.error(
          `Tried fetching guild name=${savedGuild.name},id=${savedGuild.id} but returned empty. guild disbanded??`
        )
        continue
      }

      await this.syncGuild(savedGuild, guild)
    }
  }

  private async findInstance(savedGuild: MinecraftGuild): Promise<MinecraftInstance | undefined> {
    const instances = this.application.minecraftManager.getAllInstances()
    for (const instance of instances) {
      const guildListResult = await instance.guildManager.list()
      if (guildListResult.name.toLowerCase().trim() === savedGuild.name.toLowerCase().trim()) {
        return instance
      }
    }

    return undefined
  }

  private async syncGuild(savedGuild: MinecraftGuild, guild: HypixelGuild): Promise<void> {
    this.database.initGuild(guild)
    const currentTime = Date.now()

    const skippedMembers = this.database.getSkippedMembers(
      savedGuild.id,
      currentTime - AutoGuildSync.AutoUpdateRoleEvery.toMilliseconds()
    )
    for (const guildMember of guild.members) {
      if (skippedMembers.includes(guildMember.uuid)) continue

      this.logger.trace(`fetching Mojang profile for ${guildMember.uuid} to auto update guild member status`)
      const profile = await this.application.mojangApi.profileByUuid(guildMember.uuid).catch(() => undefined)
      if (profile === undefined) {
        this.logger.warn(`Failed fetching Mojang profile for ${guildMember.uuid}`)
        continue
      }
      const target = await this.application.core.initializeMinecraftUser(profile, { guild: undefined })

      const resolvedRank = await resolveGuildRank(
        this.application,
        this.database,
        currentTime,
        savedGuild,
        guild,
        guildMember,
        target
      )
      this.database.updatedGuildMember(guild._id, guildMember, { lastRoleCheckAt: currentTime })

      if (resolvedRank === 'not-whitelisted' || resolvedRank === 'no-condition') continue
      else if (resolvedRank === 'no-rank') {
        const defaultRank = guild.ranks.find((rank) => rank.default)?.name
        assert.ok(defaultRank !== undefined)
        if (guildMember.rank !== undefined && guildMember.rank === defaultRank) {
          continue
        }

        await this.setRank(this.application, target.mojangProfile().id, defaultRank)
      } else if (guildMember.rank === undefined || guildMember.rank !== resolvedRank.rank) {
        await this.setRank(this.application, target.mojangProfile().id, resolvedRank.rank)
      }
    }
  }

  private async setRank(application: Application, uuid: string, rank: string): Promise<void> {
    await application.sendMinecraft(
      application.minecraftManager.getAllInstances(),
      MinecraftSendChatPriority.High,
      undefined,
      `/guild setrank ${uuid} ${rank}`
    )
  }
}
