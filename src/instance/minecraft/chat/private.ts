import { ChannelType, Permission } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    // REGEX: From [MVP+] USERNAME: MESSAGE
    const regex = /^From (?:\[([+A-Z]{3,10})] ){0,3}(\w{3,32}): (.{1,128})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const hypixelRank = match[1]
      const username = match[2]
      const playerMessage = match[3].trim()

      if (context.application.clusterHelper.isMinecraftBot(username)) return

      context.application.emit('chat', {
        ...context.eventHelper.fillBaseEvent(),

        channelType: ChannelType.Private,

        permission: context.clientInstance.resolvePermission(username, Permission.Anyone),
        username,
        hypixelRank: hypixelRank,

        message: playerMessage
      })
    }
  }
} satisfies MinecraftChatMessage
