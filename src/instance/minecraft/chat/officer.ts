import { ChannelType, Permission } from '../../../common/application-event.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'
import { getUuidFromGuildChat } from '../common/common'

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

      const uuid = getUuidFromGuildChat(context.jsonMessage)
      context.application.usersManager.mojangDatabase.add([{ name: username, id: uuid }])
      if (context.application.minecraftManager.isMinecraftBot(username)) {
        context.clientInstance.notifyChatEvent(ChannelType.Officer, playerMessage)
        return
      }

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

      const event = context.eventHelper.fillBaseEvent()
      context.messageAssociation.addMessageId(event.eventId, { channel: ChannelType.Officer })
      context.application.emit('chat', {
        ...event,

        channelType: ChannelType.Officer,

        permission: context.clientInstance.resolvePermission(username, Permission.Helper),
        username: username,
        uuid: uuid,
        hypixelRank: hypixelRank,
        guildRank: guildRank,

        message: filteredMessage,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
