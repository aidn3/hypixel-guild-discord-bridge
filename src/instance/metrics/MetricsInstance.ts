import { ClientInstance, LOCATION, Status } from '../../common/ClientInstance'
import Application from '../../Application'
import * as http from 'http'
import * as url from 'url'
import * as Client from 'prom-client'
import ApplicationMetrics from './ApplicationMetrics'
import GuildOnlineMetrics from './GuildOnlineMetrics'
import MetricsConfig from './common/MetricsConfig'

export default class MetricsInstance extends ClientInstance<MetricsConfig> {
  private readonly httpServer
  private readonly register

  private readonly applicationMetrics: ApplicationMetrics
  private readonly guildOnlineMetrics: GuildOnlineMetrics

  constructor(app: Application, instanceName: string, config: MetricsConfig) {
    super(app, instanceName, LOCATION.METRICS, config)

    this.register = new Client.Registry()
    this.register.setDefaultLabels({ app: 'hypixel-guild-bridge' })
    Client.collectDefaultMetrics({ register: this.register })

    this.applicationMetrics = new ApplicationMetrics(this.register, config.prefix)
    this.guildOnlineMetrics = new GuildOnlineMetrics(this.register, config.prefix)

    app.on('event', (event) => {
      this.applicationMetrics.onClientEvent(event)
    })
    app.on('chat', (event) => {
      this.applicationMetrics.onChatEvent(event)
    })
    app.on('command', (event) => {
      this.applicationMetrics.onCommandEvent(event)
    })

    setInterval(() => {
      void this.collectMetrics()
    }, config.interval * 1000)

    this.httpServer = http.createServer((req, res) => {
      // TODO: handle other paths and close the connection
      if (req.url == null) return
      const route = url.parse(req.url).pathname
      if (route === '/metrics') {
        this.logger.debug('Metrics scrap is called on /metrics')
        res.setHeader('Content-Type', this.register.contentType)

        void (async () => {
          res.end(await this.register.metrics())
        })()
      }
      if (route === '/ping') {
        this.logger.debug('Ping recieved')
        res.writeHead(200)
        res.end()
      }
    })
  }

  private async collectMetrics(): Promise<void> {
    this.logger.debug('Collecting metrics')

    if (this.config.useIngameCommand) {
      await this.guildOnlineMetrics.collectMetrics(this.app)
    }
  }

  connect(): void {
    if (this.httpServer.listening) {
      this.logger.debug('Server already listening. Returning')
      return
    }

    if (!this.config.enabled) {
      this.status = Status.FAILED
      return
    }

    this.status = Status.CONNECTING
    this.logger.debug('prometheus is enabled')

    this.logger.debug(`Listening on port ${this.config.port}`)
    this.httpServer.listen(this.config.port)

    this.status = Status.CONNECTED
  }
}
