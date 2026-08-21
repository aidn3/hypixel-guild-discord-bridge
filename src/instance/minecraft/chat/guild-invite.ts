import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType, Platform } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    /* Example message:
 "-----------------------------------------------------
[MVP++] aidn5 has invited you to join their guild, Censured!
Click here to accept or type /guild accept aidn5!
-----------------------------------------------------
"
         */
    const regex = /^-{53}\n(?:\[[A-Z+]+\] )?(\w{2,26}) has invited you to join their guild/g

    const match = regex.exec(context.message)
    if (match == undefined) return

    const username = match[1]

    const name = context.clientInstance.username()
    const uuid = context.clientInstance.uuid()
    assert.ok(name !== undefined)
    assert.ok(uuid !== undefined)
    const botUser = await context.application.core.initializeMinecraftUser({ id: uuid, name: name }, {})

    const actionCommand = /(\/guild accept \w{2,16})/g.exec(context.message)?.at(1)
    assert.ok(actionCommand != undefined)

    await context.application.emit('guildPlayer', {
      ...context.eventHelper.fillBaseEvent(),
      platform: Platform.Minecraft,

      color: Color.Info,
      channels: [ChannelType.Public, ChannelType.Officer],

      type: GuildPlayerEventType.Invited,
      user: botUser,
      message: `Account has been invited by ${username} to join their guild!`,
      command: actionCommand,
      rawMessage: context.rawMessage
    })
  }
} satisfies MinecraftChatMessage
