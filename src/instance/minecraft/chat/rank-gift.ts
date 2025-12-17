import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^Guild > (?:|\[[\w+]+\] )(\w{2,16}) gifted the [\w+]+ rank to (\w{2,16})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const responsible = match[1]
      const target = match[2]

      const targetProfile = await context.application.mojangApi.profileByUsername(target)
      const targetUser = await context.application.core.initializeMinecraftUser(
        { id: targetProfile.id, name: target },
        {}
      )

      const responsibleProfile = await context.application.mojangApi.profileByUsername(responsible)
      const responsibleUser = await context.application.core.initializeMinecraftUser(
        { id: responsibleProfile.id, name: responsible },
        {}
      )

      await context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Officer],

        type: GuildPlayerEventType.Gifted,
        user: targetUser,
        responsible: responsibleUser,

        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
