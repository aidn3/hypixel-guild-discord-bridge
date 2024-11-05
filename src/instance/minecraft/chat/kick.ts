import { ChannelType, Color, GuildPlayerEventType, InstanceType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) was kicked from the guild by .{1,32}!$/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('guildPlayer', {
        localEvent: true,

        instanceName: context.instanceName,
        instanceType: InstanceType.Minecraft,

        color: Color.Bad,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Kick,
        username: username,
        message: context.message
      })
    }
  }
} satisfies MinecraftChatMessage
