import { Color, MinecraftReactiveEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^You must be in a guild to use this command!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const originEventId = context.clientInstance.getLastEventIdForSentGuildAction()
      if (originEventId === undefined) {
        context.logger.warn('No originEventId detected. Dropping the event')
        return
      }
      context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        type: MinecraftReactiveEventType.RequireGuild,
        originEventId: originEventId,
        message: context.message
      })
    }
  }
} satisfies MinecraftChatMessage
