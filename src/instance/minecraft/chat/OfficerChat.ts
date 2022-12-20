import MinecraftInstance from "../MinecraftInstance"
import {MinecraftChatMessage} from "../common/ChatInterface"
import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import {CommandsManager} from "../CommandsManager";


export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
        // REGEX: Officer > [MVP+] aidn5 [Staff]: hello there.
        let regex = /^Officer > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]
            let playerMessage = match[2].trim()

            if (clientInstance.config.bridgePrefix
                && playerMessage.startsWith(clientInstance.config.bridgePrefix)) return
            if (clientInstance.app.clusterHelper.isMinecraftBot(username)) return

            clientInstance.app.emit("chat", {
                localEvent: true,
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.OFFICER,
                channelId: undefined,
                username: username,
                replyUsername: undefined,
                message: playerMessage
            })
        }
    }
}
