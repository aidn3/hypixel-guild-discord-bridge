const {Counter} = require("prom-client");
const register = require("./PrometheusServer");
const METRICS_CONFIG = require("../../config/metrics-config.json")

const METRICS_COMMAND = new Counter({
    name: METRICS_CONFIG.prefix + "command",
    help: 'Commands executed in guild-bridge.',
    labelNames: ['location', 'scope', 'instance', 'command'],
})
register.registerMetric(METRICS_COMMAND)

module.exports = module.exports = function (location, scope, instanceName, commandName) {
    METRICS_COMMAND.inc({location: location, scope: scope, instance: instanceName, command: commandName})
}