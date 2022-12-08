const {SCOPE} = require("../../../common/ClientInstance")
const {escapeDiscord} = require("../../../util/DiscordMessageUtil");
const COLOR = require('../../../../config/discord-config.json').events.color

module.exports = function (clientInstance, message) {
    let regex = /^-{53}\n\[[A-Za-z+]{3,10}\] {0,3}(\w{3,32}) has requested to join the Guild/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        clientInstance.app.emit("minecraft.event.request", {
            clientInstance: clientInstance,
            scope: SCOPE.PUBLIC,
            username: username,
            severity: COLOR.GOOD,
            message: `${escapeDiscord(username)} has requested to join the guild!`,
            removeLater: false
        })

        return true
    }
}