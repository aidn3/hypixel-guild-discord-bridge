const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) joined the guild!/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            "joined the guild!",
            COLOR.GOOD,
            false)
        return true
    }
}