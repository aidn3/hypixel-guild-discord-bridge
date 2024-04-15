import { ChannelType, EventType, InstanceType, Severity } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

let lastWarning = 0

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^Your mute will expire in/g

    const match = regex.exec(context.message)
    if (match != undefined && lastWarning + 5000 < Date.now()) {
      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        eventType: EventType.MUTED,
        username: undefined,
        severity: Severity.BAD,
        message: `Account has been muted. ${context.message}`,
        removeLater: false
      })
      lastWarning = Date.now()
    }
  }
} satisfies MinecraftChatMessage
