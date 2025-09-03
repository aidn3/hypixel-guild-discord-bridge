import { ChannelType, Color, GuildGeneralEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat:  function (context: MinecraftChatContext): void {
    const regex = /^\s+The Guild has reached Level \d+!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      context.application.emit('guildGeneral', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildGeneralEventType.Level,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
