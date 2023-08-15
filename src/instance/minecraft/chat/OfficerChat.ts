import MinecraftInstance from '../MinecraftInstance'
import { MinecraftChatMessage } from '../common/ChatInterface'
import { LOCATION, SCOPE } from '../../../common/ClientInstance'
import { CommandsManager } from '../CommandsManager'

export default {
  onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
    // REGEX: Officer > [MVP+] aidn5 [Staff]: hello there.
    const regex = /^Officer > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

    const match = regex.exec(message)
    if (match != null) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (clientInstance.config.bridgePrefix.length > 0 &&
                playerMessage.startsWith(clientInstance.config.bridgePrefix)) return
      if (clientInstance.app.clusterHelper.isMinecraftBot(username)) return

      clientInstance.app.emit('chat', {
        localEvent: true,
        instanceName: clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        scope: SCOPE.OFFICER,
        channelId: undefined,
        username,
        replyUsername: undefined,
        message: playerMessage
      })
    }
  }
} satisfies MinecraftChatMessage
