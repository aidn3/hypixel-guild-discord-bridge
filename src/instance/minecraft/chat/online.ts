import { EventType, InstanceType, ChannelType, Severity } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^Guild > (\w{3,32}) joined./g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.Minecraft,
        channelType: ChannelType.Public,
        eventType: EventType.Online,
        username,
        severity: Severity.Good,
        message: context.message,
        removeLater: true
      })
    }
  }
} satisfies MinecraftChatMessage
