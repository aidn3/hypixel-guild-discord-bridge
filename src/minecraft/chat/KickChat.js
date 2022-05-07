const {sendMetric, getLocation, SCOPE, TYPE} = require("../../common/PrometheusMetrics");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /(?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32}) was kicked from the guild by .{1,32}!$/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        sendMetric(getLocation(clientInstance), SCOPE.PUBLIC, TYPE.GUILD_EVENT, clientInstance.instanceName, "kick")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            message,
            COLOR.BAD,
            false)
        return true
    }
}