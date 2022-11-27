const {Gauge} = require("prom-client")
const METRICS_CONFIG = require("../../config/metrics-config.json")
const register = require("./PrometheusServer")

const GUILD_MEMBERS_ONLINE = new Gauge({
    name: METRICS_CONFIG.prefix + "guild_members_online",
    help: 'Guild online members',
    labelNames: ['name'],
})
register.registerMetric(GUILD_MEMBERS_ONLINE)

async function getOnlineMembers(minecraftInstance) {
    let onlineMembers
    const onlineRegex = /^Online Members: (\d+)$/g

    const chatListener = function (event) {
        let eventMessage = event.toString().trim()
        if (!eventMessage) return

        let onlineMatch = onlineRegex.exec(eventMessage)
        if (onlineMatch) onlineMembers = onlineMatch[1]
    }

    minecraftInstance.client.on('message', chatListener)
    minecraftInstance.send("/guild list")
    await new Promise(r => setTimeout(r, 3000))
    minecraftInstance.client.removeListener('message', chatListener)

    return Number(onlineMembers)
}

async function collectMetrics(minecraftInstance) {
    // TODO: add better logger structure
    let onlineMembers = await getOnlineMembers(minecraftInstance)
    if (!onlineMembers) return
    GUILD_MEMBERS_ONLINE.set({name: minecraftInstance.instanceName}, onlineMembers)
}

module.exports = (app) => app.minecraftInstances.forEach(collectMetrics)
