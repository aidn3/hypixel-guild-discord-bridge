const {SCOPE} = require("../../common/ClientInstance")
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^We blocked your comment "[\W\w]+" as it is breaking our rules/g

    let match = regex.exec(message)
    if (match != null) {

        clientInstance.app.emit("minecraft.event.block", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: null,
            severity: COLOR.INFO,
            message: message,
            removeLater: false
        })

        return true
    }
}