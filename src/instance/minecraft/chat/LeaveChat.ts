import {MinecraftChatMessage} from "../common/ChatInterface"
import MinecraftInstance from "../MinecraftInstance"
import {LOCATION} from "../../../common/ClientInstance"

const {SCOPE} = require("../../../common/ClientInstance")
const COLOR = require('../../../../config/discord-config.json').events.color

export default <MinecraftChatMessage>{
    onChat: function (clientInstance: MinecraftInstance, message: string): void {
        let regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) left the guild!/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]

            clientInstance.app.emit("event", {
                instanceName: clientInstance.instanceName,
                location: LOCATION.MINECRAFT,
                scope: SCOPE.PUBLIC,
                name: "leave",
                username: username,
                severity: COLOR.BAD,
                message: "left the guild!",
                removeLater: false
            })
        }
    }
}