import { ChannelType, Color, GuildGeneralEventType, Platform } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^\s+The Guild has reached Level \d+!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      await context.application.emit('guildGeneral', {
        ...context.eventHelper.fillBaseEvent(),
        platform: Platform.Minecraft,

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildGeneralEventType.Level,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
