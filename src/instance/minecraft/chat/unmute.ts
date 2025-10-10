import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import { initializeMinecraftUser } from '../../../common/user'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has unmuted (?:\[[+A-Z]{1,10}] ){0,3}(the guild chat!|\w{3,32})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const responsible = match[1]
      const target = match[2]

      const targetProfile = await context.application.mojangApi.profileByUsername(target)
      const targetUser = await initializeMinecraftUser(context.application, { id: targetProfile.id, name: target }, {})

      const responsibleProfile = await context.application.mojangApi.profileByUsername(responsible)
      const responsibleUser = await initializeMinecraftUser(
        context.application,
        { id: responsibleProfile.id, name: responsible },
        {}
      )

      if (responsible !== context.clientInstance.username()) {
        targetUser.forgive(context.eventHelper.fillBaseEvent())
      }

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Officer],

        type: GuildPlayerEventType.Unmute,
        user: targetUser,
        responsible: responsibleUser,

        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
