const http = require('http')
const url = require('url')
const client = require('prom-client');

const CLUSTER_CONFIG = require("../../config/cluster-config.json")

const LOCATION = {DISCORD: "discord", MINECRAFT: "minecraft", WEBHOOK: "webhook"}
const SCOPE = {OFFICER: "officer", PUBLIC: "public", PRIVATE: "private"}
const TYPE = {COMMAND: "command", CHAT: "chat", GUILD_EVENT: "event"}
const PREFIX = "guild_bridge_"

const register = new client.Registry()
register.setDefaultLabels({app: 'hypixel-guild-bridge'})
client.collectDefaultMetrics({register})

const METRICS_COMMAND = new client.Counter({
    name: PREFIX + TYPE.COMMAND,
    help: 'Commands executed in guild-bridge.',
    labelNames: ['location', 'scope', 'instance', 'command'],
})
register.registerMetric(METRICS_COMMAND)

METRICS_CHAT = new client.Counter({
    name: PREFIX + TYPE.CHAT,
    help: 'Chat messages sent in guild-bridge.',
    labelNames: ['location', 'scope', 'instance'],
})
register.registerMetric(METRICS_CHAT)

const METRICS_EVENTS = new client.Counter({
    name: PREFIX + TYPE.GUILD_EVENT,
    help: 'Events happened in guild-bridge.',
    labelNames: ['location', 'scope', 'instance', 'event'],
})
register.registerMetric(METRICS_EVENTS)

if (CLUSTER_CONFIG.prometheus) {
    http.createServer(async (req, res) => {
        const route = url.parse(req.url).pathname
        if (route === '/metrics') {
            console.log("data scrapped ")
            res.setHeader('Content-Type', register.contentType)
            res.end(await register.metrics())
        }
    }).listen(CLUSTER_CONFIG.prometheus_port)
}

function sendMetric(location, scope, type, instanceName, extra = null) {
    if (type === TYPE.COMMAND) {
        METRICS_COMMAND.inc({location: location, scope: scope, instance: instanceName, command: extra})

    } else if (type === TYPE.CHAT) {
        METRICS_CHAT.inc({location: location, scope: scope, instance: instanceName})

    } else if (type === TYPE.GUILD_EVENT) {
        METRICS_EVENTS.inc({location: location, scope: scope, instance: instanceName, event: extra})
    }
}

function getLocation(instance) {
    //TODO: find better way than hardcoded.
    // can't just do "instance of require(DiscordInstance)"
    // DiscordInstance itself requires THIS module
    // it gives the error:
    // Warning: Accessing non-existent property 'sendMetric' of module exports inside circular dependency

    if (instance.constructor.name === "DiscordInstance") return LOCATION.DISCORD
    if (instance.constructor.name === "MinecraftInstance") return LOCATION.MINECRAFT
    if (instance.constructor.name === "WebhookInstance") return LOCATION.WEBHOOK

    throw  new Error(`${instance} can't be recognized.`)
}

module.exports = {sendMetric, getLocation, LOCATION, SCOPE, TYPE}