const {publicCommandHandler} = require('../CommandsManager')
const {sendMetric, getLocation, SCOPE, TYPE} = require("../../common/PrometheusMetrics");

module.exports = function (clientInstance, message) {
    // REGEX: Guild > [MVP+] aidn5 [Staff]: hello there.
    let regex = /^Guild > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        let playerMessage = match[2].trim()

        if (clientInstance.bridge.isMinecraftBot(username)) return true
        if (publicCommandHandler(clientInstance, username, playerMessage)) return

        sendMetric(getLocation(clientInstance), SCOPE.PUBLIC, TYPE.CHAT, clientInstance.instanceName)
        clientInstance.bridge.onPublicChatMessage(
            clientInstance,
            username,
            playerMessage
        )
        return true
    }
}