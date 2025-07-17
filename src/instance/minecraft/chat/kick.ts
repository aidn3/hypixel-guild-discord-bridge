import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
// eslint-disable-next-line import/no-restricted-paths
import { HeatType } from '../../moderation/commands-heat.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'
import { checkHeat } from '../common/common.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex =
      /^(?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32}) was kicked from the guild by (?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32})!$/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const issuedBy = match[2]

      await checkHeat(context, issuedBy, HeatType.Kick)

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Kick,
        username: username,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
