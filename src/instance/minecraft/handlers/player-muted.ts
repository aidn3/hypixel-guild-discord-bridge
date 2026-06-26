import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import { ChannelType, Color, Platform } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class PlayerMuted extends SubInstance<MinecraftInstance, ClientSession> {
  public static readonly DefaultMessage = '{username} is currently muted and is unable to message right now.'

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
      'chat',
      async (event) => {
        if (event.instance !== this.clientInstance || event.platform !== Platform.Minecraft) return

        if (!this.application.core.minecraftConfigurations.getAnnounceMutedPlayer()) return

        if (!event.message.startsWith("Hey! I'm currently muted")) return
        if (!event.rawMessage.includes('§eHey!')) return

        let message = this.application.core.languageConfigurations.getAnnounceMutedPlayer()
        message = message.replaceAll('{username}', event.user.displayName())

        await this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Default,

          user: event.user,
          message: message
        })
      },
      { signal: this.abortSignal }
    )
  }
}
