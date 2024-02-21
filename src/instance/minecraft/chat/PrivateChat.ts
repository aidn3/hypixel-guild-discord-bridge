import { MinecraftChatContext, MinecraftChatMessage } from '../common/ChatInterface'
import { SCOPE } from '../../../common/ClientInstance'

export default {
  onChat: function (context: MinecraftChatContext): void {
    // REGEX: From [MVP+] USERNAME: MESSAGE
    const regex = /^From (?:\[[+A-Z]{3,10}] ){0,3}(\w{3,32}): (.{1,128})/g

    const match = regex.exec(context.message)
    if (match != undefined) {
      const username = match[1]
      const playerMessage = match[2].trim()

      if (context.application.clusterHelper.isMinecraftBot(username)) return
      void context.commandsManager.handle(context.clientInstance, SCOPE.PRIVATE, username, playerMessage)
    }
  }
} satisfies MinecraftChatMessage
