const {sendMetric, getLocation, SCOPE, TYPE} = require("../../common/PrometheusMetrics");
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}\w{3,32} has unmuted (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.bridge.punishedUsers.unmute(username)

        sendMetric(getLocation(clientInstance), SCOPE.OFFICER, TYPE.GUILD_EVENT, clientInstance.instanceName, "unmute")
        clientInstance.bridge.onOfficerEvent(
            clientInstance,
            username,
            message,
            COLOR.INFO,
            false)
        return true
    }
}