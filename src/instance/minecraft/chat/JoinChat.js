const {SCOPE} = require("../../../common/ClientInstance")
const COLOR = require('../../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Za-z+]{3,10}\] ){0,3}(\w{3,32}) joined the guild!/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.app.emit("minecraft.event.join", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: username,
            severity: COLOR.GOOD,
            message: "joined the guild!",
            removeLater: false
        })

        return true
    }
}