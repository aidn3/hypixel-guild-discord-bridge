import MinecraftInstance from "../MinecraftInstance"
import {ChatEvent} from "../../../common/ApplicationEvent"
import {publicCommandHandler} from '../CommandsManager'
import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import {MinecraftChatMessage} from "../common/ChatInterface"

const {bridge_prefix} = require("../../../../config/minecraft-config.json")

export default <MinecraftChatMessage>{
    onChat: async function (clientInstance: MinecraftInstance, message: string): Promise<void> {
        // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
        let regex = /^Guild > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]
            let playerMessage = match[2].trim()

            if (bridge_prefix && playerMessage.startsWith(bridge_prefix)) return
            if (clientInstance.app.punishedUsers.mutedTill(username)) return
            if (clientInstance.app.clusterHelper.isMinecraftBot(username)) return
            if (await publicCommandHandler(clientInstance, username, playerMessage)) return

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