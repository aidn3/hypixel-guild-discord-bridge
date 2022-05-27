const EventsMetrics = require("../../metrics/EventsMetrics");
const {getLocation, SCOPE} = require("../../metrics/Util");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^We blocked your comment "[\W\w]+" as it is breaking our rules/g

    let match = regex.exec(message)
    if (match != null) {

        EventsMetrics(getLocation(clientInstance), SCOPE.PUBLIC, clientInstance.instanceName, "we_blocked_your_comment")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            null,
            message,
            COLOR.INFO,
            false)

        return true
    }
}