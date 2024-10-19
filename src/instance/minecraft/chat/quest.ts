import { EventType, InstanceType, ChannelType, Severity } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^GUILD QUEST TIER [1-9] COMPLETED!/g

    const match = regex.exec(context.message.trim())
    if (match != undefined) {
      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.Minecraft,
        channelType: ChannelType.Public,
        eventType: EventType.Quest,
        username: undefined,
        severity: Severity.Good,
        message: context.message.trim(),
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
