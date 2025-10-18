import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^You have been unmuted!/g

    const match = regex.exec(context.message)
    const username = context.clientInstance.username()
    const uuid = context.clientInstance.uuid()
    assert.ok(username !== undefined)
    assert.ok(uuid !== undefined)
    const botUser = await context.application.core.initializeMinecraftUser({ id: uuid, name: username }, {})

    if (match != undefined) {
      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Unmuted,
        user: botUser,
        message: `Account has been guild unmuted.`,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
