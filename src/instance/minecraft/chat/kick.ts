import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import { initializeMinecraftUser } from '../../../common/user'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) was kicked from the guild by (?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32})!$/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const responsibleUsername = match[2]

      const uuid = await context.application.mojangApi.profileByUsername(username).then((profile) => profile.id)
      const user = await initializeMinecraftUser(context.application, { id: uuid, name: username }, {})

      const responsible = await context.application.mojangApi.profileByUsername(responsibleUsername)
      const responsibleProfile = await initializeMinecraftUser(
        context.application,
        { name: responsibleUsername, id: responsible.id },
        {}
      )

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Kick,
        user: user,
        responsible: responsibleProfile,

        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
