const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] ){0,}(\w{3,32}) was demoted from /g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            message,
            COLOR.BAD,
            false)
        return true
    }
}