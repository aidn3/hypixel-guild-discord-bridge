import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType, Platform } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    /* Example message:
    "-----------------------------------------------------
  You have been invited to these guilds while offline: Melon Grass (/guild accept MelonGrassBot), Lemon Grass (/guild accept DracTheFurry)-----------------------------------------------------"
     */
    const regex = /^-{53}\nYou have been invited to these guilds while offline:(.+)-{53}/g

    const match = regex.exec(context.message)
    if (match == undefined) return

    const name = context.clientInstance.username()
    const uuid = context.clientInstance.uuid()
    assert.ok(name !== undefined)
    assert.ok(uuid !== undefined)
    const botUser = await context.application.core.initializeMinecraftUser({ id: uuid, name: name }, {})

    const invites = match[1].trim().split(',')
    for (const invite of invites) {
      const guildName = invite.split('(', 1)[0].trim()
      const actionCommand = invite.split('(', 2)[1].split(')', 1)[0].trim()

      await context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),
        platform: Platform.Minecraft,

        color: Color.Info,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Invited,
        user: botUser,
        message: `Account has been invited to join ${guildName}!`,
        command: actionCommand,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
