import MinecraftInstance from "../MinecraftInstance"
import {ClientEvent} from "../../../common/ApplicationEvent"
import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import {MinecraftChatMessage} from "../common/ChatInterface";
import {ColorScheme} from "../../discord/common/DiscordConfig";


export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, message: string): void {
        let regex = /^Guild > (\w{3,32}) left./g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.emit("event", <ClientEvent>{
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: "offline",
                username: username,
                severity: ColorScheme.INFO,
                message: message,
                removeLater: true
            })

        }
    }
}