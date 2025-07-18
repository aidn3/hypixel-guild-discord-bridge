import {
  ChannelType,
  InstanceType,
  MinecraftSendChatPriority,
  Permission,
  PunishmentType
} from '../../../common/application-event.js'
import { durationToMinecraftDuration } from '../../../utility/shared-utility'
import { LinkType } from '../../users/features/verification.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

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

      const identifiers = [username]
      const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
      if (mojangProfile) {
        identifiers.push(mojangProfile.id, mojangProfile.name)

        const link = await context.application.usersManager.verification.findByIngame(mojangProfile.id)
        if (link.type === LinkType.Confirmed) identifiers.push(link.link.discordId)
      }

      const mutedTill = context.application.moderation.punishments.punishedTill(identifiers, PunishmentType.Mute)
      if (mutedTill) {
        context.application.emit('minecraftSend', {
          ...context.eventHelper.fillBaseEvent(),
          targetInstanceName: context.application.getInstancesNames(InstanceType.Minecraft),
          priority: MinecraftSendChatPriority.High,
          command: `/guild mute ${username} ${durationToMinecraftDuration(mutedTill - Date.now())}`
        })
      }

      // if any other punishments active
      if (context.application.moderation.punishments.findByUser(identifiers).length > 0) return
      if (context.application.minecraftManager.isMinecraftBot(username)) {
        context.clientInstance.notifyChatEvent(ChannelType.Public, playerMessage)
        return
      }

      const { filteredMessage, changed } = context.application.moderation.filterProfanity(playerMessage)
      if (changed) {
        context.application.emit('profanityWarning', {
          ...context.eventHelper.fillBaseEvent(),

          channelType: ChannelType.Public,

          username,
          originalMessage: playerMessage,
          filteredMessage: filteredMessage
        })
      }

      const event = context.eventHelper.fillBaseEvent()
      context.messageAssociation.addMessageId(event.eventId, { channel: ChannelType.Public })
      context.application.emit('chat', {
        ...event,

        channelType: ChannelType.Public,

        permission: context.clientInstance.resolvePermission(username, Permission.Anyone),
        username,
        hypixelRank: hypixelRank,
        guildRank: guildRank,

        message: filteredMessage,
        rawMessage: context.rawMessage
      })
    }
  }
} satisfies MinecraftChatMessage
