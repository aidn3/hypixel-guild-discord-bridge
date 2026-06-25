import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { GuildPlayerEvent, GuildPlayerResponsible } from '../../../common/application-event.js'
import {
  ChannelType,
  Color,
  GuildPlayerEventType,
  MinecraftSendChatPriority
} from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import { HeatResult, HeatType } from '../../../core/moderation/commands-heat'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class PunishmentHandler extends SubInstance<MinecraftInstance, ClientSession> {
  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    eventHelper: EventHelper<MinecraftInstance>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    abortSignal: AbortSignal
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler, abortSignal)
    this.application.on(
      'guildPlayer',
      async (event) => {
        if (event.instance !== this.clientInstance) return

        await this.onGuildPlayer(event).catch(this.errorHandler.promiseCatch('handling guildPlayer event'))
      },
      { signal: this.abortSignal }
    )
  }

  private async onGuildPlayer(event: GuildPlayerEvent): Promise<void> {
    switch (event.type) {
      case GuildPlayerEventType.Mute:
      case GuildPlayerEventType.Unmute: {
        await this.checkHeat(event, HeatType.Mute)
        break
      }
      case GuildPlayerEventType.Kick: {
        await this.checkHeat(event, HeatType.Kick)
      }
    }
  }

  private async checkHeat(event: GuildPlayerResponsible, heatType: HeatType): Promise<void> {
    const mojangProfile = event.responsible.mojangProfile()
    const username = mojangProfile.name
    const uuid = mojangProfile.id

    if (
      this.application.minecraftManager.isMinecraftBot(username) ||
      this.application.minecraftManager.isMinecraftBot(uuid)
    )
      return

    const heatResult = await event.responsible.addModerationAction(heatType)

    if (heatResult === HeatResult.Warn) {
      await this.application.emit('broadcast', {
        ...this.eventHelper.fillBaseEvent(),
        channels: [ChannelType.Public, ChannelType.Officer],
        color: Color.Info,

        user: event.responsible,
        message: `${username}, you have been issuing too many dangerous commands in a short time. Slow down!`
      })
    } else if (heatResult === HeatResult.Denied) {
      await this.application.emit('broadcast', {
        ...this.eventHelper.fillBaseEvent(),
        channels: [ChannelType.Public, ChannelType.Officer],
        color: Color.Bad,

        user: event.responsible,
        message: `${username}, you have issued too many dangerous commands in a short time. Stop it!`
      })

      await this.clientInstance.send(`/g demote ${uuid}`, MinecraftSendChatPriority.High, undefined)
    }
  }
}
