const {publicCommandHandler} = require('../CommandsManager')
const {SCOPE} = require("../../../common/ClientInstance")
const {bridge_prefix} = require("../../../../config/minecraft-config.json")

module.exports = async function (clientInstance, message) {
    // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
    let regex = /^Guild > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        let playerMessage = match[2].trim()

        if (bridge_prefix && playerMessage.startsWith(bridge_prefix)) return
        if (clientInstance.app.punishedUsers.mutedTill(username)) return
        if (clientInstance.app.isMinecraftBot(username)) return true
        if (await publicCommandHandler(clientInstance, username, playerMessage)) return

        clientInstance.app.emit("minecraft.chat", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: username,
            replyUsername: null,
            message: playerMessage
        })

        return true
    }
}