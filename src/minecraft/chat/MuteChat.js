const {SCOPE} = require("../../common/ClientInstance")
const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}\w{3,32} has muted (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32}) for (\d)([dm])/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        let muteTime = match[2]
        let muteSuffice = match[3]

        clientInstance.app.punishedUsers.mute(username, muteTime * sufficeToTime(muteSuffice))

        clientInstance.app.emit("minecraft.event.mute", {
            clientInstance: clientInstance,
            scope: SCOPE.OFFICER,
            username: username,
            severity: COLOR.BAD,
            message: message,
            removeLater: false
        })

        return true
    }
}

function sufficeToTime(suffice) {
    if (suffice === "m") return 1000 * 60 // 1 minute in milliseconds
    else if (suffice === "d") return 1000 * 60 * 60 * 24 // 1 day in milliseconds
    throw new Error(`Unexpected suffice: ${suffice}. New update to handle the new one`)
}