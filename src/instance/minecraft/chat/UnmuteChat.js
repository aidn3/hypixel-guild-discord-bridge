const {SCOPE} = require("../../../common/ClientInstance")
const COLOR = require('../../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}\w{3,32} has unmuted (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.app.punishedUsers.unmute(username)

        clientInstance.app.emit("minecraft.event.unmute", {
            clientInstance: clientInstance,
            scope: SCOPE.OFFICER,
            username: username,
            severity: COLOR.INFO,
            message: message,
            removeLater: false
        })

        return true
    }
}