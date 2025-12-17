import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    // Message sounds too generic.
    // raw message is used to also detect formatting to increase false positives
    const regex = /^§aYou joined §6[\w\W]+§a!$/g

    const match = regex.exec(context.rawMessage)
    if (match != undefined) {
      const name = context.clientInstance.username()
      const uuid = context.clientInstance.uuid()
      assert.ok(name !== undefined)
      assert.ok(uuid !== undefined)
      const botUser = await context.application.core.initializeMinecraftUser({ id: uuid, name: name }, {})

      await context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Good,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Joined,
        user: botUser,
        message: context.message,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
