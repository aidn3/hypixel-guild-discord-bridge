import assert from 'node:assert'

import { ChannelType, Color, GuildPlayerEventType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
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

      const responsibleProfile = await context.application.mojangApi.profileByUsername(responsible)
      const responsibleUser = await context.application.core.initializeMinecraftUser(responsibleProfile, {})

      const name = context.clientInstance.username()
      const uuid = context.clientInstance.uuid()
      assert.ok(name !== undefined)
      assert.ok(uuid !== undefined)
      const botUser = await context.application.core.initializeMinecraftUser({ id: uuid, name: name }, {})

      context.application.emit('guildPlayer', {
        ...context.eventHelper.fillBaseEvent(),

        color: Color.Bad,
        channels: [ChannelType.Public, ChannelType.Officer],

        type: GuildPlayerEventType.Muted,
        user: botUser,
        responsible: responsibleUser,
        message: `Account has been guild muted for ${formattedDuration} by ${formattedResponsible}.`,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
