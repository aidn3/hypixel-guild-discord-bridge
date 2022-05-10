const {Counter} = require("prom-client")
const register = require("./PrometheusServer")
const METRICS_CONFIG = require("../../config/metrics-config.json")

const METRICS_CHAT = new Counter({
    name: METRICS_CONFIG.prefix + "chat",
    help: 'Chat messages sent in guild-bridge.',
    labelNames: ['location', 'scope', 'instance'],
})
register.registerMetric(METRICS_CHAT)

module.exports = function (location, scope, instanceName) {
    METRICS_CHAT.inc({location: location, scope: scope, instance: instanceName})
}