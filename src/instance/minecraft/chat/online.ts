import { ChannelType, Color, GuildPlayerEventType, InstanceType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^Guild > (\w{3,32}) joined./g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('guildPlayer', {
        localEvent: true,

        instanceName: context.instanceName,
        instanceType: InstanceType.Minecraft,

        color: Color.Good,
        channels: [ChannelType.Public],

        type: GuildPlayerEventType.Online,
        username: username,
        message: context.message
      })
    }
  }
} satisfies MinecraftChatMessage
