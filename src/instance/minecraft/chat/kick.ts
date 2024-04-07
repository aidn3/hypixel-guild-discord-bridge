import { EventType, InstanceType, ChannelType, Severity } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) was kicked from the guild by .{1,32}!$/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        eventType: EventType.KICK,
        username,
        severity: Severity.BAD,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
