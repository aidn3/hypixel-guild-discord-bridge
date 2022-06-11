const GuildApiMetrics = require("./GuildApiMetrics")
const GuildOnlineMetrics = require("./GuildOnlineMetrics")

const ChatMetrics = require("./ChatMetrics")
const CommandMetrics = require("./CommandMetrics")
const EventMetrics = require("./EventMetrics")

const {instanceType} = require("../common/ClientInstance");

module.exports = function (app) {
    GuildApiMetrics(this)
    GuildOnlineMetrics(this)

    app.on("*.event.*", function ({clientInstance, scope}) {
        let eventName = this.event.split(".").pop()
        EventMetrics(instanceType(clientInstance), scope, clientInstance.instanceName, eventName)
    })

    app.on("*.chat", function ({clientInstance, scope}) {
        ChatMetrics(instanceType(clientInstance), scope, clientInstance.instanceName)
    })

    app.on("*.command.*", function ({clientInstance, scope}) {
        let commandName = this.event.split(".").pop()
        CommandMetrics(instanceType(clientInstance), scope, clientInstance.instanceName, commandName)
    })
}