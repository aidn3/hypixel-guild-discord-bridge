import type { MinecraftChatContext, MinecraftChatMessage } from '../common/ChatInterface'
import { ColorScheme } from '../../discord/common/DiscordConfig'
import { EventType, InstanceType, ChannelType } from '../../../common/ApplicationEvent'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^GUILD QUEST TIER [1-9] COMPLETED!/g

    const match = regex.exec(context.message.trim())
    if (match != undefined) {
      context.application.emit('event', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        name: EventType.QUEST,
        username: undefined,
        severity: ColorScheme.GOOD,
        message: context.message.trim(),
        removeLater: false
      })
    }
  }
} satisfies MinecraftChatMessage
