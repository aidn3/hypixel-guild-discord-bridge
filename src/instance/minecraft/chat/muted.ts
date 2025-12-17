import { Color, MinecraftReactiveEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

let lastWarning = 0

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^Your mute will expire in/g

    const match = regex.exec(context.message)
    if (match != undefined && lastWarning + 300_000 < Date.now()) {
      const originEventId = context.clientInstance.getLastEventIdForSentChatMessage()
      if (originEventId === undefined) {
        context.logger.warn('No originEventId detected. Dropping the event')
        return
      }
      await context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        type: MinecraftReactiveEventType.Muted,
        originEventId: originEventId,
        message: `Account has been muted. ${context.message}`,
        rawMessage: context.rawMessage
      })
      lastWarning = Date.now()
    }
  }
} satisfies MinecraftChatMessage
