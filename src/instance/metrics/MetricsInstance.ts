import {ClientInstance, LOCATION, Status} from "../../common/ClientInstance"
import Application from "../../Application"
import * as http from "http"
import * as url from "url"
import * as Client from "prom-client"
import ApplicationMetrics from "./ApplicationMetrics"
import GuildApiMetrics from "./GuildApiMetrics"
import GuildOnlineMetrics from "./GuildOnlineMetrics"

const METRICS_CONFIG = require("../../../config/metrics-config.json")

export default class MetricsInstance extends ClientInstance {
    private readonly httpServer
    private readonly register

    private readonly applicationMetrics: ApplicationMetrics
    private readonly guildApiMetrics: GuildApiMetrics
    private readonly guildOnlineMetrics: GuildOnlineMetrics

    constructor(app: Application, instanceName: string) {
        super(app, instanceName, LOCATION.METRICS)

        this.register = new Client.Registry()
        this.register.setDefaultLabels({app: 'hypixel-guild-bridge'})
        Client.collectDefaultMetrics({register: this.register})

        this.applicationMetrics = new ApplicationMetrics(this.register, METRICS_CONFIG.prefix)
        this.guildApiMetrics = new GuildApiMetrics(this.register, METRICS_CONFIG.prefix)
        this.guildOnlineMetrics = new GuildOnlineMetrics(this.register, METRICS_CONFIG.prefix)

        app.on("event", event => this.applicationMetrics.onClientEvent(event))
        app.on("chat", event => this.applicationMetrics.onChatEvent(event))
        app.on("command", event => this.applicationMetrics.onCommandEvent(event))

        setInterval(() => this.collectMetrics(), METRICS_CONFIG.metrics_frequency * 1000)

        this.httpServer = http.createServer(async (req, res) => {
            if (!req.url) return
            const route = url.parse(req.url).pathname
            if (route === '/metrics') {
                this.logger.debug("Metrics scrap is called on /metrics")
                res.setHeader('Content-Type', this.register.contentType)
                res.end(await this.register.metrics())
            }
        })
    }

    private async collectMetrics(): Promise<void> {
        this.logger.debug("Collecting metrics")

        if (METRICS_CONFIG.collect_guild_metrics_via_hypixel_api) {
            await this.guildApiMetrics.collectMetrics(
                this.app.clusterHelper.getMinecraftBotsUuid(),
                this.app.clusterHelper.getHypixelApiKey()
            )
        }

        if (METRICS_CONFIG.collect_guild_metrics_via_ingame_commands) {
            await this.guildOnlineMetrics.collectMetrics(this.app)
        }
    }

    async connect(): Promise<void> {
        if (!METRICS_CONFIG.prometheus) {
            this.status = Status.FAILED
            return
        }

        this.status = Status.CONNECTING
        this.logger.debug("prometheus is enabled")

        this.logger.debug(`Listening on port ${METRICS_CONFIG.prometheus_port}`)
        this.httpServer.listen(METRICS_CONFIG.prometheus_port)

        this.status = Status.CONNECTED
    }
}
