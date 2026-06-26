import { ChannelType, Color, GuildGeneralEventType, Platform } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^GUILD QUEST TIER [1-9] COMPLETED!/g

    const match = regex.exec(context.message.trim())
    if (match != undefined) {
      await context.application.emit('guildGeneral', {
        ...context.eventHelper.fillBaseEvent(),
        platform: Platform.Minecraft,

        color: Color.Good,
        channels: [ChannelType.Public],

        type: GuildGeneralEventType.Quest,
        message: context.message.trim(),
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
