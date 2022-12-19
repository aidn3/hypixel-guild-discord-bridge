// noinspection JSUnusedGlobalSymbols

import MinecraftInstance from "../MinecraftInstance"
import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import {MinecraftChatMessage} from "../common/ChatInterface"
import {ColorScheme} from "../../discord/common/DiscordConfig";
import {CommandsManager} from "../CommandsManager";


export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, commandsManager: CommandsManager, message: string): void {
        let regex = /^We blocked your comment "[\W\w]+" as it is breaking our rules/g

        let match = regex.exec(message)
        if (match != null) {

            clientInstance.app.emit("event", {
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: "block",
                username: undefined,
                severity: ColorScheme.INFO,
                message: message,
                removeLater: false
            })
        }
    }
}