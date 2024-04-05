import { EventType, InstanceType, ChannelType, Severity } from '../../../common/application-event'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^-{53}\n\[[+A-Za-z]{3,10}] {0,3}(\w{3,32}) has requested to join the Guild/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        eventType: EventType.REQUEST,
        username,
        severity: Severity.GOOD,
        message: `${username} has requested to join the guild!`,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
