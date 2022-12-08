const {SCOPE} = require("../../../common/ClientInstance")
const COLOR = require('../../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] )*(\w{3,32}) was demoted from /g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.app.emit("minecraft.event.demote", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: username,
            severity: COLOR.BAD,
            message: message,
            removeLater: false
        })

        return true
    }
}