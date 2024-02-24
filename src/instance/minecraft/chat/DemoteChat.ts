import type { MinecraftChatContext, MinecraftChatMessage } from '../common/ChatInterface'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { EventType, InstanceType, ChannelType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) was demoted from /g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        name: EventType.DEMOTE,
        username,
        severity: ColorScheme.BAD,
        message: context.message,
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
