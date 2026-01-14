import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^Guild > (?:\[[+A-Z]{1,10}] )*(\w{2,32}) enabled the chat throttle!/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const uuid = await context.application.mojangApi.profileByUsername(username).then((profile) => profile.id)
      const user = await context.application.core.initializeMinecraftUser({ id: uuid, name: username }, {})

      await context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.ThrottleEnabled,
        user: user,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
