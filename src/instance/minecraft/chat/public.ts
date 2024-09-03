import { ChannelType, InstanceType, PunishmentType } from '../../../common/application-event.js'
import { PunishedUsers } from '../../../util/punished-users.js'
import type { MinecraftChatContext, MinecraftChatMessage } from '../common/chat-interface.js'

export default {
  onChat: async function (context: MinecraftChatContext): Promise<void> {
    // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
    const regex = /^Guild > (?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32})(?: \[\w{1,10}]){0,3}:(.{1,256})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (
        context.clientInstance.bridgePrefix.length > 0 &&
        playerMessage.startsWith(context.clientInstance.bridgePrefix)
      ) {
        return
      }

      const mojangProfile = await context.application.mojangApi.profileByUsername(username).catch(() => undefined)
      const identifiers = [username]
      if (mojangProfile) identifiers.push(mojangProfile.id, mojangProfile.name)

      const mutedTill = context.application.punishedUsers.getPunishedTill(identifiers, PunishmentType.MUTE)
      if (mutedTill) {
        context.application.clusterHelper.sendCommandToAllMinecraft(
          `/guild mute ${username} ${PunishedUsers.durationToMinecraftDuration(mutedTill - Date.now())}`
        )
      }

      // if any other punishments active
      if (context.application.punishedUsers.findPunishmentsByUser(identifiers).length > 0) return
      if (context.application.clusterHelper.isMinecraftBot(username)) return

      const { filteredMessage, changed } = context.application.filterProfanity(playerMessage)
      if (changed) {
        context.application.emit('profanityWarning', {
          localEvent: true,
          instanceType: InstanceType.MINECRAFT,
          instanceName: context.instanceName,
          channelType: ChannelType.PUBLIC,

          username,
          originalMessage: playerMessage,
          filteredMessage: filteredMessage
        })
      }

      context.application.emit('chat', {
        localEvent: true,
        instanceName: context.instanceName,
        instanceType: InstanceType.MINECRAFT,
        channelType: ChannelType.PUBLIC,
        channelId: undefined,
        username,
        replyUsername: undefined,
        message: filteredMessage
      })
    }
  }
} satisfies MinecraftChatMessage
