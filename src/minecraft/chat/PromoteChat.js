const {SCOPE} = require("../../common/ClientInstance")
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] )*(\w{3,32}) was promoted from /g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.app.emit("minecraft.event.promote", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: username,
            severity: COLOR.GOOD,
            message: message,
            removeLater: false
        })

        return true
    }
}