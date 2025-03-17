import { Color, MinecraftChatEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^We blocked your comment "[\W\w]+" because/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        channels: [],

        type: MinecraftChatEventType.Block,
        originEventId: context.clientInstance.getLastEventIdForSentChatMessage(),
        message: 'The message has been blocked by Hypixel for breaking its rules.'
      })
    }
  }
} satisfies MinecraftChatMessage
