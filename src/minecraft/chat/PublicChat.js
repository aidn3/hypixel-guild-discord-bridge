const {publicCommandHandler} = require('../CommandsManager')
const ChatMetrics = require("../../metrics/ChatMetrics");
const {getLocation, SCOPE} = require("../../metrics/Util");

module.exports = function (clientInstance, message) {
    // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
    let regex = /^Guild > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        let playerMessage = match[2].trim()

        if (clientInstance.bridge.isMinecraftBot(username)) return true
        if (publicCommandHandler(clientInstance, username, playerMessage)) return

        ChatMetrics(getLocation(clientInstance), SCOPE.PUBLIC, clientInstance.instanceName)
        clientInstance.bridge.onPublicChatMessage(
            clientInstance,
            username,
            null, //TODO: find way to find reply to
            playerMessage
        )
        return true
    }
}