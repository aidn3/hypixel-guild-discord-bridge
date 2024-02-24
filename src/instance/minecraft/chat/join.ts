import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'
import { ColorScheme } from '../../discord/common/discord-config'
import { EventType, InstanceType, ChannelType } from '../../../common/application-event'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^(?:\[[+A-Za-z]{3,10}] ){0,3}(\w{3,32}) joined the guild!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        name: EventType.JOIN,
        username,
        severity: ColorScheme.GOOD,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
