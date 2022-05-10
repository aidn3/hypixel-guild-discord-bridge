const http = require("http")
const url = require("url")

const METRICS_CONFIG = require("../../config/metrics-config.json")
const Client = require("prom-client")

if (METRICS_CONFIG.prometheus) {
    http.createServer(async (req, res) => {
        const route = url.parse(req.url).pathname
        if (route === '/metrics') {
            //TODO: add metrics scrap to logger
            // as DEBUG
            res.setHeader('Content-Type', register.contentType)
            res.end(await register.metrics())
        }
    }).listen(METRICS_CONFIG.prometheus_port)
}

const register = new Client.Registry()
register.setDefaultLabels({app: 'hypixel-guild-bridge'})
Client.collectDefaultMetrics({register})

module.exports = register