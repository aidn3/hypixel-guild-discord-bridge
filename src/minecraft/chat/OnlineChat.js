const {sendMetric, getLocation, SCOPE, TYPE} = require("../../common/PrometheusMetrics");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^Guild > (\w{3,32}) joined./g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        sendMetric(getLocation(clientInstance), SCOPE.PUBLIC, TYPE.GUILD_EVENT, clientInstance.instanceName,"online")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            message,
            COLOR.INFO,
            true)
        return true
    }
}