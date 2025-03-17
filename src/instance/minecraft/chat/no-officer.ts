import { Color, MinecraftChatEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^You don't have access to the officer chat!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        channels: [],

        type: MinecraftChatEventType.NoOfficer,
        originEventId: context.clientInstance.getLastEventIdForSentChatMessage(),
        message: context.message
      })
    }
  }
} satisfies MinecraftChatMessage
