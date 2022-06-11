const log4js = require("log4js")

const clientLogger = log4js.getLogger("client")
const commandLogger = log4js.getLogger("command")
const eventLogger = log4js.getLogger("event")
const chatLogger = log4js.getLogger("chat")

module.exports = (app) => {
    // discord, minecraft, webhook
    // block, demote, join, kick, leave, mute, offline, online, promote, repeat, unmute
    app.on("*.event.*", ({clientInstance, scope, username, severity, message, removeLater}) => {
        eventLogger.info(`[${scope}][${clientInstance?.instanceName}] ${username}: ${message}`)
    })

    // discord, minecraft, webhook
    app.on("*.chat", ({clientInstance, scope, username, replyUsername, message}) => {
        chatLogger.info(`[${scope}][${clientInstance?.instanceName}] ${username}->${replyUsername}: ${message}`)
    })

    // discord, minecraft, webhook
    app.on("*.command.*", ({clientInstance, scope, username, fullCommand}) => {
        commandLogger.info(`[${scope}][${clientInstance?.instanceName}] ${username}: ${fullCommand}`)
    })

    // main, minecraft, discord, webhook
    // start, connect, conflict(e.g. someone logged in from another location), kick, end, disconnect
    app.on("*.client.*", function ({clientInstance, reason}) {
        let eventName = this.event.split(".").pop()
        clientLogger.info(`${eventName} [${clientInstance?.instanceName}]: ${reason}`)
    })
}