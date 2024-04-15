import { EventType, InstanceType, ChannelType, Severity } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^We blocked your comment "[\W\w]+" as it is breaking our rules/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        eventType: EventType.BLOCK,
        username: undefined,
        severity: Severity.INFO,
        message: 'The message has been blocked by Hypixel for breaking the rules.',
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
