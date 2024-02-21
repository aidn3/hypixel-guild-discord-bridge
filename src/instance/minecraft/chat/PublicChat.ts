import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { MinecraftChatContext, MinecraftChatMessage } from '../common/ChatInterface'

export default {
  onChat: function (context: MinecraftChatContext): void {
    // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
    const regex = /^Guild > (?:\[[+A-Z]{1,10}] ){0,3}(\w{3,32})(?: \[\w{1,10}]){0,3}:(.{1,256})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (
        context.clientInstance.config.bridgePrefix.length > 0 &&
        playerMessage.startsWith(context.clientInstance.config.bridgePrefix)
      ) {
        return
      }
      if (context.application.punishedUsers.mutedTill(username) != undefined) return
      if (context.application.clusterHelper.isMinecraftBot(username)) return
      // NOTE: Changed after ESLINT
      void context.commandsManager.handle(context.clientInstance, SCOPE.PUBLIC, username, playerMessage)

      context.application.emit('chat', {
        localEvent: true,
        instanceName: context.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.PUBLIC,
        channelId: undefined,
        username,
        replyUsername: undefined,
        message: playerMessage
      })
    }
  }
} satisfies MinecraftChatMessage
