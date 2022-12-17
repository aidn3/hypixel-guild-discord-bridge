import MinecraftInstance from "../MinecraftInstance"
import {ClientEvent} from "../../../common/ApplicationEvent"
import {MinecraftChatMessage} from "../common/ChatInterface"
import {LOCATION} from "../../../common/ClientInstance"
import {ColorScheme} from "../../discord/common/DiscordConfig";

const {SCOPE} = require("../../../common/ClientInstance")


export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, message: string): void {
        let regex = /^Guild > (\w{3,32}) joined./g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.emit("event", <ClientEvent>{
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: "online",
                username: username,
                severity: ColorScheme.INFO,
                message: message,
                removeLater: true
            })
        }
    }
}