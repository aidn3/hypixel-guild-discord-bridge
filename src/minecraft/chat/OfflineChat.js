const EventsMetrics = require("../../metrics/EventsMetrics");
const {getLocation, SCOPE} = require("../../metrics/Util");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^Guild > (\w{3,32}) left./g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        EventsMetrics(getLocation(clientInstance), SCOPE.PUBLIC, clientInstance.instanceName, "offline")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            message,
            COLOR.INFO,
            true)
        return true
    }
}