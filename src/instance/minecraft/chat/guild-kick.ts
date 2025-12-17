import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType, InstanceMessageType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    const regex = /^You were kicked from the guild by/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const name = context.clientInstance.username()
      const uuid = context.clientInstance.uuid()
      assert.ok(name !== undefined)
      assert.ok(uuid !== undefined)
      const botUser = await context.application.core.initializeMinecraftUser({ id: uuid, name: name }, {})

      await context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Kicked,
        user: botUser,
        message: `Account has been kicked from the guild.`,
        rawMessage: context.rawMessage
      })

      await context.clientInstance.broadcastInstanceMessage({
        type: InstanceMessageType.MinecraftGuildKicked,
        value: context.message
      })
    }
  }
} satisfies MinecraftChatMessage
