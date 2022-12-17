import MinecraftInstance from "../MinecraftInstance"
import {ClientEvent} from "../../../common/ApplicationEvent"
import {MinecraftChatMessage} from "../common/ChatInterface"
import {LOCATION} from "../../../common/ClientInstance"
import {ColorScheme} from "../../discord/common/DiscordConfig";

const {SCOPE} = require("../../../common/ClientInstance")

export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, message: string): void {
        let regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) joined the guild!/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.emit("event", <ClientEvent>{
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: "join",
                username: username,
                severity: ColorScheme.GOOD,
                message: "joined the guild!",
                removeLater: false
            })
        }
    }
}