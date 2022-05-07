const {sendMetric, getLocation, SCOPE, TYPE} = require("../../common/PrometheusMetrics");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^You cannot say the same message twice!/g

    let match = regex.exec(message)
    if (match != null) {

        sendMetric(getLocation(clientInstance), SCOPE.PUBLIC, TYPE.GUILD_EVENT, clientInstance.instanceName, "you_can_not_say_same_message_twice")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            null,
            message,
            COLOR.INFO,
            true)
        return true
    }
}