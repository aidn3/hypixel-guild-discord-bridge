const {sendMetric, getLocation, SCOPE, TYPE} = require("../../common/PrometheusMetrics");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) joined the guild!/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        sendMetric(getLocation(clientInstance), SCOPE.PUBLIC, TYPE.GUILD_EVENT, clientInstance.instanceName,"join")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            "joined the guild!",
            COLOR.GOOD,
            false)
        return true
    }
}