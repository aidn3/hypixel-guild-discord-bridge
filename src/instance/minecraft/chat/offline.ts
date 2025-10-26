import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^Guild > (\w{3,32}) left./g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const uuid = await context.application.mojangApi.profileByUsername(username).then((profile) => profile.id)
      const user = await context.application.core.initializeMinecraftUser({ name: username, id: uuid }, {})

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Info,
        channels: [ChannelType.Public],

        type: GuildPlayerEventType.Offline,
        user: user,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
