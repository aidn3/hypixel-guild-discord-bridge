const {privateCommandHandler} = require('../CommandsManager')

module.exports = function (clientInstance, message) {
    // REGEX: From [MVP+] USERNAME: MESSAGE
    let regex = /^From (?:\[[A-Z+]{3,10}\] ){0,3}(\w{3,32})\: (.{1,128})/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        let playerMessage = match[2].trim()

        if (clientInstance.bridge.isMinecraftBot(username)) return true
        privateCommandHandler(clientInstance, username, playerMessage)
        return true
    }
}