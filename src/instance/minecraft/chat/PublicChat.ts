import MinecraftInstance from "../MinecraftInstance"
import {ChatEvent} from "../../../common/ApplicationEvent"
import {CommandsManager} from '../CommandsManager'
import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import {MinecraftChatMessage} from "../common/ChatInterface"


export default <MinecraftChatMessage>{
    onChat: async function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): Promise<void> {
        // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
        let regex = /^Guild > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]
            let playerMessage = match[2].trim()

            if (clientInstance.config.bridgePrefix
                && playerMessage.startsWith(clientInstance.config.bridgePrefix)) return
            if (clientInstance.app.punishedUsers.mutedTill(username)) return
            if (clientInstance.app.clusterHelper.isMinecraftBot(username)) return
            if (await commandsManager.publicCommandHandler(clientInstance, username, playerMessage)) return

            clientInstance.app.emit("chat", <ChatEvent>{
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                channelId: undefined,
                username: username,
                replyUsername: undefined,
                message: playerMessage
            })
        }
    }
}