import { EventType, InstanceType, ChannelType, Severity } from '../../../common/application-event'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) was promoted from /g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        eventType: EventType.PROMOTE,
        username,
        severity: Severity.GOOD,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
