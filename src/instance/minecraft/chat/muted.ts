import { Color, MinecraftChatEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

let lastWarning = 0

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^Your mute will expire in/g

    const match = regex.exec(context.message)
    if (match != undefined && lastWarning + 300_000 < Date.now()) {
      context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        channels: [],

        type: MinecraftChatEventType.Muted,
        originEventId: context.clientInstance.getLastEventIdForSentChatMessage(),
        message: `Account has been muted. ${context.message}`
      })
      lastWarning = Date.now()
    }
  }
} satisfies MinecraftChatMessage
