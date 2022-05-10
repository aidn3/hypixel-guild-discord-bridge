const EventsMetrics = require("../../metrics/EventsMetrics");
const {getLocation, SCOPE} = require("../../metrics/Util");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) left the guild!/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        EventsMetrics(getLocation(clientInstance), SCOPE.PUBLIC, clientInstance.instanceName, "leave")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            "left the guild!",
            COLOR.BAD,
            false)
        return true
    }
}