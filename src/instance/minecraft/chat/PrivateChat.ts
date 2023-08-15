import MinecraftInstance from '../MinecraftInstance'
import { CommandsManager } from '../CommandsManager'
import { MinecraftChatMessage } from '../common/ChatInterface'

export default {
  onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
    // REGEX: From [MVP+] USERNAME: MESSAGE
    const regex = /^From (?:\[[A-Z+]{3,10}\] ){0,3}(\w{3,32}): (.{1,128})/g

    const match = regex.exec(message)
    if (match != null) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (clientInstance.app.clusterHelper.isMinecraftBot(username)) return
      void commandsManager.privateCommandHandler(clientInstance, username, playerMessage)
    }
  }
} satisfies MinecraftChatMessage
