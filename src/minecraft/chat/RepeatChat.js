const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^You cannot say the same message twice!/g

    let match = regex.exec(message)
    if (match != null) {

        clientInstance.bridge.onPublicEvent(
            clientInstance,
            null,
            message,
            COLOR.INFO,
            true)
        return true
    }
}