const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}\w{3,32} has muted (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32}) for/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.bridge.onOfficerEvent(
            clientInstance,
            username,
            message,
            COLOR.BAD,
            false)
        return true
    }
}