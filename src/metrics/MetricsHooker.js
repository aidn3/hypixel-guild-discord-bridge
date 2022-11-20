const METRICS_CONFIG = require("../../config/metrics-config.json")
if (!METRICS_CONFIG.prometheus) return

const logger = require("log4js").getLogger("prometheus")
logger.debug("prometheus is enabled")

const GuildApiMetrics = METRICS_CONFIG.collect_guild_metrics_via_hypixel_api ? require("./GuildApiMetrics") : null
const GuildOnlineMetrics = METRICS_CONFIG.collect_guild_metrics_via_ingame_commands ? require("./GuildOnlineMetrics") : null

const ChatMetrics = require("./ChatMetrics")
const CommandMetrics = require("./CommandMetrics")
const EventMetrics = require("./EventMetrics")

const {instanceType} = require("../common/ClientInstance");

module.exports = function (app) {
    setInterval(() => {
        logger.debug("Collecting metrics")
        if (GuildApiMetrics) GuildApiMetrics(app)
        if (GuildOnlineMetrics) GuildOnlineMetrics(app)
    }, METRICS_CONFIG.metrics_frequency * 1000)

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