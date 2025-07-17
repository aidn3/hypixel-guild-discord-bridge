import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) has unmuted (?:\[[+A-Z]{1,10}] ){0,3}(the guild chat!|\w{3,32})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const responsible = match[1]
      const target = match[2]

      const mojangProfile = await context.application.mojangApi.profileByUsername(target).catch(() => undefined)
      const identifiers = [target]
      if (mojangProfile) identifiers.push(mojangProfile.id, mojangProfile.name)

      context.application.moderation.punishments.remove({
        ...context.eventHelper.fillBaseEvent(),
        userIdentifiers: identifiers
      })

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Officer],

        type: GuildPlayerEventType.Unmute,
        username: responsible,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
