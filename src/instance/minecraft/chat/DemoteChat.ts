import MinecraftInstance from "../MinecraftInstance"
import {MinecraftChatMessage} from "../common/ChatInterface"
import {LOCATION} from "../../../common/ClientInstance"
import {ColorScheme} from "../../discord/common/DiscordConfig";
import {CommandsManager} from "../CommandsManager";

const {SCOPE} = require("../../../common/ClientInstance")

export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
        let regex = /^(?:\[[A-Z+]{1,10}\] )*(\w{3,32}) was demoted from /g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.emit("event", {
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: "demote",
                username: username,
                severity: ColorScheme.BAD,
                message: message,
                removeLater: false
            })
        }
    }
}