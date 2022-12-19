import MinecraftInstance from "../MinecraftInstance"
import {CommandsManager} from '../CommandsManager'
import {MinecraftChatMessage} from "../common/ChatInterface"

export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
        // REGEX: From [MVP+] USERNAME: MESSAGE
        let regex = /^From (?:\[[A-Z+]{3,10}\] ){0,3}(\w{3,32})\: (.{1,128})/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]
            let playerMessage = match[2].trim()

            if (clientInstance.app.clusterHelper.isMinecraftBot(username)) return
            commandsManager.privateCommandHandler(clientInstance, username, playerMessage)
        }
    }
}