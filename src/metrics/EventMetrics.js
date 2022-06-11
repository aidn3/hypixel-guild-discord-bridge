const {Counter} = require("prom-client");
const register = require("./PrometheusServer");
const METRICS_CONFIG = require("../../config/metrics-config.json")

const METRICS_EVENTS = new Counter({
    name: METRICS_CONFIG.prefix + "event",
    help: 'Events happened in guild-bridge.',
    labelNames: ['location', 'scope', 'instance', 'event'],
})
register.registerMetric(METRICS_EVENTS)

module.exports = function (location, scope, instanceName, eventName) {
    METRICS_EVENTS.inc({location: location, scope: scope, instance: instanceName, event: eventName})
}