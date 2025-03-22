import { Color, MinecraftChatEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^You must be in a guild to use this command!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        channels: [], // don't send to channels unless they are expecting a reply via originEventId.

        type: MinecraftChatEventType.RequireGuild,
        originEventId: context.clientInstance.getLastEventIdForSentGuildAction(),
        message: context.message
      })
    }
  }
} satisfies MinecraftChatMessage
