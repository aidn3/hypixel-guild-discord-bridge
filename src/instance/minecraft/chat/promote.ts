import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import { initializeMinecraftUser } from '../../../common/user'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^(?:\[[+A-Z]{1,10}] )*(\w{3,32}) was promoted from /g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const uuid = await context.application.mojangApi.profileByUsername(username).then((profile) => profile.id)
      const user = await initializeMinecraftUser(context.application, { id: uuid, name: username }, {})

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Promote,
        user: user,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
