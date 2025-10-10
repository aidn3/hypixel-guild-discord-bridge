import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import { initializeMinecraftUser } from '../../../common/user'
import Duration from '../../../utility/duration'
import { sufficeToTime } from '../../../utility/shared-utility'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has muted (?:\[[+A-Z]{1,10}] ){0,3}(the guild chat|\w{3,32}) for (\d+)([dhms])/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const responsible = match[1]
      const target = match[2]
      const muteTime = Number(match[3])
      const muteSuffice = match[4]

      const targetProfile = await context.application.mojangApi.profileByUsername(target)
      const targetUser = await initializeMinecraftUser(context.application, { id: targetProfile.id, name: target }, {})

      const responsibleProfile = await context.application.mojangApi.profileByUsername(responsible)
      const responsibleUser = await initializeMinecraftUser(
        context.application,
        { id: responsibleProfile.id, name: responsible },
        {}
      )

      if (responsible !== context.clientInstance.username()) {
        targetUser.mute(
          context.eventHelper.fillBaseEvent(),
          Duration.seconds(muteTime * sufficeToTime(muteSuffice)),
          context.message
        )
      }

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        channels: [ChannelType.Officer],

        type: GuildPlayerEventType.Mute,
        user: targetUser,
        responsible: responsibleUser,

        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
