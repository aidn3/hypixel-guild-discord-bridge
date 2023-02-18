import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import MinecraftInstance from "../MinecraftInstance"
import {MinecraftChatMessage} from "../common/ChatInterface"
import {ColorScheme} from "../../discord/common/DiscordConfig";
import {CommandsManager} from "../CommandsManager";
import {EventType} from "../../../common/ApplicationEvent";


export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
        let regex = /^(?:\[[A-Z+]{1,10}\] )*(\w{3,32}) was promoted from /g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.emit("event", {
                localEvent: true,
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: EventType.PROMOTE,
                username: username,
                severity: ColorScheme.GOOD,
                message: message,
                removeLater: false
            })
        }
    }
}
