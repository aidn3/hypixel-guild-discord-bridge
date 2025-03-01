import { ChannelType, Color, MinecraftChatEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^Advertising is against the rules\. You will receive a punishment on the server/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      context.application.emit('minecraftChatEvent', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        channels: [ChannelType.Public],

        type: MinecraftChatEventType.Advertise,
        originEventId: context.clientInstance.getLastEventIdForSentChatMessage(),
        message: 'The message has been blocked by Hypixel for advertising.'
      })
    }
  }
} satisfies MinecraftChatMessage
