const {SCOPE} = require("../../../common/ClientInstance")
const COLOR = require('../../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^Guild > (\w{3,32}) left./g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.app.emit("minecraft.event.offline", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: username,
            severity: COLOR.INFO,
            message: message,
            removeLater: true
        })

        return true
    }
}