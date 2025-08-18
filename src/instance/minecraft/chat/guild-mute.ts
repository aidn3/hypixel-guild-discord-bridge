import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    const regex =
      /^You have been guild muted for (?<duration>[dhms0-9\s]+) by (?<rank>\[[+A-Z]{1,10}] )?(?<responsible>\w{3,32})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      assert.ok(match.groups)
      const formattedDuration = match.groups.duration.toLowerCase()
      const rank = (match.groups.rank as string | undefined)?.trim()
      const responsible = match.groups.responsible

      let formattedResponsible = ''
      if (rank !== undefined) formattedResponsible += rank + ' '
      formattedResponsible += responsible

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Muted,
        username: responsible,
        message: `Account has been guild muted for ${formattedDuration} by ${formattedResponsible}.`,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
