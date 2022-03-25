const COLOR = require('../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^(?:\[[A-Z+]{1,10}\] ){0,3}\w{3,32} has muted (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32}) for (\d)([dm])/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        let muteTime = match[2]
        let muteSuffice = match[3]

        clientInstance.bridge.punishedUsers.mute(username, muteTime * sufficeToTime(muteSuffice))

        clientInstance.bridge.onOfficerEvent(
            clientInstance,
            username,
            message,
            COLOR.BAD,
            false)
        return true
    }
}

function sufficeToTime(suffice) {
    if (suffice === "m") return 1000 * 60 // 1 minute in milliseconds
    else if (suffice === "d") return 1000 * 60 * 60 * 24 // 1 day in milliseconds
    throw new Error(`Unexpected suffice: ${suffice}. New update to handle the new one`)
}