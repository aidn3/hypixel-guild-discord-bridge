const {sendMetric, getLocation, SCOPE, TYPE} = require("../../common/PrometheusMetrics");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) left the guild!/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        sendMetric(getLocation(clientInstance), SCOPE.PUBLIC, TYPE.GUILD_EVENT, clientInstance.instanceName,"leave")
        clientInstance.bridge.onPublicEvent(
            clientInstance,
            username,
            "left the guild!",
            COLOR.BAD,
            false)
        return true
    }
}