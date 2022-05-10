const ChatMetrics = require("../../metrics/ChatMetrics");
const {getLocation, SCOPE} = require("../../metrics/Util");
module.exports = function (clientInstance, message) {
    // REGEX: Officer > [MVP+] aidn5 [Staff]: hello there.
    let regex = /^Officer > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[\w{1,10}\]){0,3}:(.{1,256})/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        let playerMessage = match[2].trim()

        if (clientInstance.bridge.isMinecraftBot(username)) return true

        ChatMetrics(getLocation(clientInstance), SCOPE.OFFICER, clientInstance.instanceName)
        clientInstance.bridge.onOfficerChatMessage(
            clientInstance,
            username,
            playerMessage
        )
        return true
    }
}