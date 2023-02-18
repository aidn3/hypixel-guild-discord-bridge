import MinecraftInstance from "../MinecraftInstance"
import {MinecraftChatMessage} from "../common/ChatInterface"
import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import {ColorScheme} from "../../discord/common/DiscordConfig";
import {CommandsManager} from "../CommandsManager";
import {EventType} from "../../../common/ApplicationEvent";


export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
        let regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}\w{3,32} has unmuted (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.punishedUsers.unmute(username)

            clientInstance.app.emit("event", {
                localEvent: true,
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.OFFICER,
                name: EventType.UNMUTE,
                username: username,
                severity: ColorScheme.INFO,
                message: message,
                removeLater: false
            })
        }
    }
}
