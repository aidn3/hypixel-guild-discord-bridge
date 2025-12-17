import { ChannelType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    // REGEX: From [MVP+] USERNAME: MESSAGE
    const regex = /^From (?:\[([+A-Z]{3,10})] ){0,3}(\w{3,32}): (.{1,128})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const hypixelRank = match[1]
      const username = match[2]
      const playerMessage = match[3].trim()

      const uuid = await context.application.mojangApi.profileByUsername(username).then((profile) => profile.id)
      const user = await context.application.core.initializeMinecraftUser({ name: username, id: uuid }, {})

      if (context.application.minecraftManager.isMinecraftBot(username)) return

      const event = context.eventHelper.fillBaseEvent()
      context.messageAssociation.addMessageId(event.eventId, { channel: ChannelType.Private, username: username })
      await context.application.emit('chat', {
        ...event,

        channelType: ChannelType.Private,

        user: user,
        hypixelRank: hypixelRank,

        message: playerMessage,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
