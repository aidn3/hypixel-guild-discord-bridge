import { ChannelType } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: function (context: MinecraftChatContext): void {
    // REGEX: Officer > [MVP+] aidn5 [Staff]: hello there.
    const regex = /^Officer > (?:\[([+A-Z]{1,10})] ){0,3}(\w{3,32})(?: \[(\w{1,10})]){0,3}:(.{1,256})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const hypixelRank = match[1]
      const username = match[2]
      const guildRank = match[3]
      const playerMessage = match[4].trim()

      if (
        context.clientInstance.bridgePrefix.length > 0 &&
        playerMessage.startsWith(context.clientInstance.bridgePrefix)
      )
        return
      if (context.application.clusterHelper.isMinecraftBot(username)) return

      const { filteredMessage, changed } = context.application.moderation.filterProfanity(playerMessage)
      if (changed) {
        context.application.emit('profanityWarning', {
          ...context.eventHelper.fillBaseEvent(),

          channelType: ChannelType.Officer,

          username,
          originalMessage: playerMessage,
          filteredMessage: filteredMessage
        })
      }

      context.application.emit('chat', {
        ...context.eventHelper.fillBaseEvent(),

        channelType: ChannelType.Officer,

        username,
        hypixelRank: hypixelRank,
        guildRank: guildRank,

        message: filteredMessage
      })
    }
  }
} satisfies MinecraftChatMessage
