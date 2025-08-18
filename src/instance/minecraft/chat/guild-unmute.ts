import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex = /^You have been unmuted!/g

    const match = regex.exec(context.message)
    const username = context.clientInstance.username()
    assert.ok(username !== undefined)

    if (match != undefined) {
      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Unmuted,
        username: username,
        message: `Account has been guild unmuted.`,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
