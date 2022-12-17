import MinecraftInstance from "../MinecraftInstance"
import {LOCATION, SCOPE} from "../../../common/ClientInstance"
import {escapeDiscord} from "../../../util/DiscordMessageUtil"
import {MinecraftChatMessage} from "../common/ChatInterface"

const COLOR = require('../../../../config/discord-config.json').events.color

export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, message: string): void {
        let regex = /^-{53}\n\[[A-Za-z+]{3,10}\] {0,3}(\w{3,32}) has requested to join the Guild/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.emit("event", {
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: "request",
                username: username,
                severity: COLOR.GOOD,
                message: `${escapeDiscord(username)} has requested to join the guild!`,
                removeLater: false
            })
        }
    }
}