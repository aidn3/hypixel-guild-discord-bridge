import type { Logger } from 'log4js'

import type Application from '../../application'
import type { GuildPlayerEvent, Punishment, PunishmentForgive } from '../../common/application-event'
import {
  GuildPlayerEventType,
  InstanceType,
  MinecraftSendChatPriority,
  PunishmentType
} from '../../common/application-event'
import type EventHelper from '../../common/event-helper'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler'
import type { MinecraftUser } from '../../common/user'
import Duration from '../../utility/duration'
import { durationToMinecraftDuration } from '../../utility/shared-utility'
import type { Core } from '../core'

export default class PunishmentsEnforcer extends SubInstance<Core, InstanceType.Core, void> {
  private static readonly LagLeniency = Duration.seconds(30)

  constructor(
    application: Application,
    instance: Core,
    eventHelper: EventHelper<InstanceType.Core>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, instance, eventHelper, logger, errorHandler)

    this.application.on('guildPlayer', (event) => {
      void this.onGuildPlayer(event).catch(this.errorHandler.promiseCatch('handling guildPlayer event'))
    })
    this.application.on('punishmentAdd', (event) => {
      void this.onPunishmentAdd(event).catch(this.errorHandler.promiseCatch('handling punishmentAdd event'))
    })

    this.application.on('punishmentForgive', (event) => {
      void this.onPunishmentForgive(event).catch(this.errorHandler.promiseCatch('handling punishmentForgive event'))
    })
  }

  private async onPunishmentAdd(event: Punishment): Promise<void> {
    if (event.instanceType === InstanceType.Minecraft) return

    const userUuid: string | undefined = event.user.mojangProfile()?.id
    if (userUuid === undefined) return

    switch (event.type) {
      case PunishmentType.Mute: {
        await this.enforceMute(userUuid, event)
        break
      }
      case PunishmentType.Ban: {
        await this.enforceBan(userUuid, event.reason)
        break
      }
      default: {
        //eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`unknown punishment type ${event.type}`)
      }
    }
  }

  private async onPunishmentForgive(event: PunishmentForgive): Promise<void> {
    if (event.instanceType === InstanceType.Minecraft) return

    const userUuid: string | undefined = event.user.mojangProfile()?.id
    if (userUuid === undefined) return
    await this.unmute(userUuid)
  }

  private async onGuildPlayer(event: GuildPlayerEvent): Promise<void> {
    switch (event.type) {
      case GuildPlayerEventType.Unmute:
      case GuildPlayerEventType.Join: {
        await this.checkAndEnforce(event.user, [PunishmentType.Ban, PunishmentType.Mute])
        break
      }
      case GuildPlayerEventType.Mute:
      case GuildPlayerEventType.Promote:
      case GuildPlayerEventType.Demote:
      case GuildPlayerEventType.Offline:
      case GuildPlayerEventType.Online: {
        await this.checkAndEnforce(event.user, [PunishmentType.Ban])
      }
    }
  }

  private async checkAndEnforce(user: MinecraftUser, types: PunishmentType[]): Promise<void> {
    const userUuid = user.mojangProfile().id
    const punishments = user.punishments()

    if (types.includes(PunishmentType.Ban)) {
      const longestPunishment = punishments.longestPunishment(PunishmentType.Mute)
      if (longestPunishment !== undefined) {
        await this.enforceBan(userUuid, longestPunishment.reason)
        return
      }
    }

    if (types.includes(PunishmentType.Mute)) {
      const longestPunishment = punishments.longestPunishment(PunishmentType.Mute)
      if (longestPunishment !== undefined) {
        await this.enforceMute(userUuid, longestPunishment)
        return
      }
    }
  }

  private async unmute(userUuid: string): Promise<void> {
    await this.application.sendMinecraft(
      this.application.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/guild unmute ${userUuid}`
    )
  }

  private async enforceMute(userUuid: string, event: Pick<Punishment, 'createdAt' | 'till'>): Promise<void> {
    /*
     * Use the creation time if there is a server lag when forwarding the punishment.
     * This is done to avoid visual bugs that are shown when a message is displayed to users
     * regarding the punishment.
     *
     * An example is muting someone for 15 minutes, but the mute shows as "14 minutes and 57 seconds"
     * which will be regarded as a quite odd punishment.
     */
    const currentTime = Date.now()
    const startTime =
      currentTime - event.createdAt <= PunishmentsEnforcer.LagLeniency.toMilliseconds() ? event.createdAt : currentTime
    if (event.till <= startTime) return

    const muteDuration = event.till - startTime

    await this.application.sendMinecraft(
      this.application.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/guild mute ${userUuid} ${durationToMinecraftDuration(muteDuration)}`
    )
  }

  private async enforceBan(userUuid: string, reason: string): Promise<void> {
    await this.application.sendMinecraft(
      this.application.getInstancesNames(InstanceType.Minecraft),
      MinecraftSendChatPriority.High,
      undefined,
      `/guild kick ${userUuid} ${reason}`
    )
  }
}
