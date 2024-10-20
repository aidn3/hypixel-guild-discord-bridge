import { ChannelType, Color, GuildPlayerEventType, InstanceType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^-{53}\n\[[+A-Za-z]{3,10}] {0,3}(\w{3,32}) has requested to join the Guild/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]

      context.application.emit('guildPlayer', {
        localEvent: true,

        instanceName: context.instanceName,
        instanceType: InstanceType.Minecraft,

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Request,
        username: username,
        message: `${username} has requested to join the guild!`
      })
    }
  }
} satisfies MinecraftChatMessage
