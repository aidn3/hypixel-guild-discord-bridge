import http from 'node:http'

import { HttpStatusCode } from 'axios'
import * as Client from 'prom-client'

import type { MetricsConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance, Status } from '../../common/client-instance.js'

import ApplicationMetrics from './application-metrics.js'
import GuildOnlineMetrics from './guild-online-metrics.js'

export default class MetricsInstance extends ClientInstance<MetricsConfig> {
  private readonly httpServer
  private readonly register

  private readonly applicationMetrics: ApplicationMetrics
  private readonly guildOnlineMetrics: GuildOnlineMetrics

  constructor(app: Application, instanceName: string, config: MetricsConfig) {
    super(app, instanceName, InstanceType.Metrics, config)

    this.register = new Client.Registry()
    this.register.setDefaultLabels({ app: 'hypixel-guild-bridge' })
    Client.collectDefaultMetrics({ register: this.register })

    this.applicationMetrics = new ApplicationMetrics(this.register, config.prefix)
    this.guildOnlineMetrics = new GuildOnlineMetrics(this.register, config.prefix)

    app.on('guildPlayer', (event) => {
      this.applicationMetrics.onClientEvent(event)
    })
    app.on('guildGeneral', (event) => {
      this.applicationMetrics.onClientEvent(event)
    })
    app.on('minecraftChatEvent', (event) => {
      this.applicationMetrics.onClientEvent(event)
    })
    app.on('chat', (event) => {
      this.applicationMetrics.onChatEvent(event)
    })
    app.on('command', (event) => {
      this.applicationMetrics.onCommandEvent(event)
    })

    setInterval(() => {
      void this.collectMetrics().catch(this.errorHandler.promiseCatch('collecting metrics'))
    }, config.interval * 1000)

    this.httpServer = http.createServer((request, response) => {
      if (request.url == undefined) {
        response.writeHead(HttpStatusCode.NotFound)
        response.end()
        return
      }

      const route = request.url.split('?')[0]
      if (route === '/metrics') {
        this.logger.debug('Metrics scrap is called on /metrics')
        response.setHeader('Content-Type', this.register.contentType)

        void (async () => {
          response.end(await this.register.metrics())
        })().catch(() => {
          response.end()
        })
      } else if (route === '/ping') {
        this.logger.debug('Ping received')
        response.writeHead(HttpStatusCode.Ok)
        response.end()
      } else {
        response.writeHead(HttpStatusCode.NotFound)
        response.end()
      }
    })
  }

  private async collectMetrics(): Promise<void> {
    this.logger.debug('Collecting metrics')

    if (this.config.useIngameCommand) {
      await this.guildOnlineMetrics.collectMetrics(this.application)
    }
  }

  connect(): void {
    if (this.httpServer.listening) {
      this.logger.debug('Server already listening. Returning')
      return
    }

    if (!this.config.enabled) {
      this.setAndBroadcastNewStatus(Status.Failed, 'Metrics are disabled.')
      return
    }

    this.logger.debug(`Listening on port ${this.config.port}`)
    this.httpServer.listen(this.config.port)

    this.logger.debug('prometheus is enabled')
    this.setAndBroadcastNewStatus(Status.Connected, 'Metrics webserver is listening for collectors')
  }
}
