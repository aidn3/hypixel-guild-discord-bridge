import { InstanceType, GuildGeneralEventType, Color, ChannelType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^GUILD QUEST TIER [1-9] COMPLETED!/g

    const match = regex.exec(context.message.trim())
    if (match != undefined) {
      context.application.emit('guildGeneral', {
        localEvent: true,

        instanceName: context.instanceName,
        instanceType: InstanceType.Minecraft,

        color: Color.Good,
        channels: [ChannelType.Public],

        type: GuildGeneralEventType.Quest,
        message: context.message.trim()
      })
    }
  }
} satisfies MinecraftChatMessage
