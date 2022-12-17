import {ClientInstance, LOCATION, Status} from "../../common/ClientInstance"
import Application from "../../Application"
import * as http from "http"
import * as url from "url"
import * as Client from "prom-client"
import ApplicationMetrics from "./ApplicationMetrics"
import GuildApiMetrics from "./GuildApiMetrics"
import GuildOnlineMetrics from "./GuildOnlineMetrics"
import MetricsConfig from "./common/MetricsConfig";


export default class MetricsInstance extends ClientInstance {
    private readonly httpServer
    private readonly register
    private readonly config: MetricsConfig

    private readonly applicationMetrics: ApplicationMetrics
    private readonly guildApiMetrics: GuildApiMetrics
    private readonly guildOnlineMetrics: GuildOnlineMetrics

    constructor(app: Application, instanceName: string, config: MetricsConfig) {
        super(app, instanceName, LOCATION.METRICS)

        this.config = config
        this.register = new Client.Registry()
        this.register.setDefaultLabels({app: 'hypixel-guild-bridge'})
        Client.collectDefaultMetrics({register: this.register})

        this.applicationMetrics = new ApplicationMetrics(this.register, config.prefix)
        this.guildApiMetrics = new GuildApiMetrics(this.register, config.prefix)
        this.guildOnlineMetrics = new GuildOnlineMetrics(this.register, config.prefix)

        app.on("event", event => this.applicationMetrics.onClientEvent(event))
        app.on("chat", event => this.applicationMetrics.onChatEvent(event))
        app.on("command", event => this.applicationMetrics.onCommandEvent(event))

        setInterval(() => this.collectMetrics(), config.interval * 1000)

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

        if (this.config.useHypixelApi) {
            await this.guildApiMetrics.collectMetrics(
                this.app.clusterHelper.getMinecraftBotsUuid(),
                this.app.clusterHelper.getHypixelApiKey()
            )
        }

        if (this.config.useIngameCommand) {
            await this.guildOnlineMetrics.collectMetrics(this.app)
        }
    }

    async connect(): Promise<void> {
        if (!this.config.enabled) {
            this.status = Status.FAILED
            return
        }

        this.status = Status.CONNECTING
        this.logger.debug("prometheus is enabled")

        this.logger.debug(`Listening on port ${this.config.port}`)
        this.httpServer.listen(this.config.port)

        this.status = Status.CONNECTED
    }
}
