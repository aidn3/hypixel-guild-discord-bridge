const {Gauge} = require("prom-client")
const axios = require("axios")

const register = require("./PrometheusServer")
const METRICS_CONFIG = require("../../config/metrics-config.json")
const HYPIXEL_KEY = process.env.HYPIXEL_KEY


const GUILD_EXP_TOTAL = new Gauge({
    name: METRICS_CONFIG.prefix + "guild_exp_total",
    help: 'Guild experience (or GEXP) a guild accumulated',
    labelNames: ['name'],
})
register.registerMetric(GUILD_EXP_TOTAL)


const GUILD_EXP_GAME = new Gauge({
    name: METRICS_CONFIG.prefix + "guild_exp_game",
    help: 'Guild experience (or GEXP) a guild accumulated based on game type',
    labelNames: ['name', 'type'],
})
register.registerMetric(GUILD_EXP_GAME)

const GUILD_MEMBERS = new Gauge({
    name: METRICS_CONFIG.prefix + "guild_members",
    help: 'Guild members count',
    labelNames: ['name'],
})
register.registerMetric(GUILD_MEMBERS)

async function collectMetrics(uuid) {
    if (!uuid) return
    // TODO: add better logger structure
    let guild = await axios.get(`https://api.hypixel.net/guild?key=${HYPIXEL_KEY}&player=${uuid}`)
        .then(res => res.data.guild)

    GUILD_EXP_TOTAL.set({name: guild["name_lower"]}, guild["exp"])

    for (let gameType of Object.keys(guild["guildExpByGameType"])) {
        let exp = guild["guildExpByGameType"][gameType]
        GUILD_EXP_GAME.set({name: guild["name_lower"], type: gameType}, exp)
    }

    GUILD_MEMBERS.set({name: guild["name_lower"]}, guild["members"].length)
}

module.exports = function (app) {
    setInterval(
        () => app.minecraftInstances.forEach(i => collectMetrics(i.uuid())),
        METRICS_CONFIG.metrics_frequency * 1000
    )
}