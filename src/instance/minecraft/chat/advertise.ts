import { Color, MinecraftReactiveEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^Advertising is against the rules\. You will receive a punishment on the server/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const originEventId = context.clientInstance.getLastEventIdForSentChatMessage()
      if (originEventId === undefined) {
        context.logger.warn('No originEventId detected. Dropping the event')
        return
      }
      await context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        type: MinecraftReactiveEventType.Advertise,
        originEventId: originEventId,
        message: 'The message has been blocked by Hypixel for advertising.',
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
