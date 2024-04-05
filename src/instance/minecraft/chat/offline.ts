import { EventType, InstanceType, ChannelType, Severity } from '../../../common/application-event'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^Guild > (\w{3,32}) left./g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        eventType: EventType.OFFLINE,
        username,
        severity: Severity.INFO,
        message: context.message,
        removeLater: true
      })
    }
  }
} satisfies MinecraftChatMessage
