import { ChannelType, MinecraftSendChatPriority, PunishmentType } from '../../../common/application-event.js'
import { durationToMinecraftDuration } from '../../../utility/shared-utility'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'
import { getUuidFromGuildChat } from '../common/common'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
    const regex = /^Guild > (?:\[([+A-Z]{1,10})] ){0,3}(\w{3,32})(?: \[(\w{1,10})]){0,3}:(.{1,256})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const hypixelRank = match[1]
      const username = match[2]
      const guildRank = match[3]
      const playerMessage = match[4].trim()
      const uuid = getUuidFromGuildChat(context.jsonMessage)

      const user = await context.application.core.initializeMinecraftUser({ name: username, id: uuid }, {})

      const punishments = user.punishments()
      const mutedTill = punishments.punishedTill(PunishmentType.Mute)
      if (mutedTill) {
        await context.clientInstance.send(
          `/guild mute ${username} ${durationToMinecraftDuration(mutedTill - Date.now())}`,
          MinecraftSendChatPriority.High,
          undefined
        )
      }

      // if any other punishments active
      if (punishments.all().length > 0) return
      if (context.application.minecraftManager.isMinecraftBot(username)) {
        context.clientInstance.notifyChatEvent(ChannelType.Public, playerMessage)
        return
      }

      const { filteredMessage, changed } = context.application.core.filterProfanity(playerMessage)
      if (changed) {
        context.application.emit('profanityWarning', {
          ...context.eventHelper.fillBaseEvent(),

          channelType: ChannelType.Public,

          user: user,
          originalMessage: playerMessage,
          filteredMessage: filteredMessage
        })
      }

      const event = context.eventHelper.fillBaseEvent()
      context.messageAssociation.addMessageId(event.eventId, { channel: ChannelType.Public })
      context.application.emit('chat', {
        ...event,

        channelType: ChannelType.Public,

        user: user,
        hypixelRank: hypixelRank,
        guildRank: guildRank,

        message: filteredMessage,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
