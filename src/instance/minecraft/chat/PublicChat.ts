import MinecraftInstance from '../MinecraftInstance'
import { CommandsManager } from '../CommandsManager'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { MinecraftChatMessage } from '../common/ChatInterface'

export default {
  onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
    // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
    const regex = /^Guild > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

    const match = regex.exec(message)
    if (match != null) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (clientInstance.config.bridgePrefix.length > 0 &&
        playerMessage.startsWith(clientInstance.config.bridgePrefix)) {
        return
      }
      if (clientInstance.app.punishedUsers.mutedTill(username) != null) return
      if (clientInstance.app.clusterHelper.isMinecraftBot(username)) return
      // NOTE: Changed after ESLINT
      void commandsManager.publicCommandHandler(clientInstance, username, playerMessage)

      clientInstance.app.emit('chat', {
        localEvent: true,
        instanceName: clientInstance.instanceName,
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
