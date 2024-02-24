import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface'
import { ColorScheme } from '../../discord/common/discord-config'
import { EventType, InstanceType, ChannelType } from '../../../common/application-event'

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
        name: EventType.PROMOTE,
        username,
        severity: ColorScheme.GOOD,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
