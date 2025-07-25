import assert from 'node:assert'
import http from 'node:http'

import { HttpStatusCode } from 'axios'
import * as Client from 'prom-client'

import type { PrometheusConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'

import ApplicationMetrics from './application-metrics.js'
import GuildOnlineMetrics from './guild-online-metrics.js'

export default class PrometheusInstance extends Instance<InstanceType.Prometheus> {
  private readonly httpServer
  private readonly register

  private readonly applicationMetrics: ApplicationMetrics
  private readonly guildOnlineMetrics: GuildOnlineMetrics

  private readonly config: PrometheusConfig

  constructor(app: Application, config: PrometheusConfig) {
    super(app, InternalInstancePrefix + InstanceType.Prometheus, InstanceType.Prometheus)

    assert.ok(config.enabled)
    this.config = config

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

    this.httpServer = http.createServer((request, response) => {
      if (request.url == undefined) {
        response.writeHead(HttpStatusCode.NotFound)
        response.end()
        return
      }

      const route = request.url.split('?')[0]
      if (route === '/metrics') {
        this.logger.debug('Prometheus scrap is called on /metrics')
        response.setHeader('Content-Type', this.register.contentType)

        void this.collectMetrics()
          .then(() => this.register.metrics())
          .then((metrics) => response.end(metrics))
          .catch(() => response.end())
      } else if (route === '/ping') {
        this.logger.debug('Ping received')
        response.writeHead(HttpStatusCode.Ok)
        response.end()
      } else {
        response.writeHead(HttpStatusCode.NotFound)
        response.end()
      }
    })

    this.logger.debug(`Listening on port ${this.config.port}`)
    this.httpServer.listen(this.config.port)

    this.logger.debug('prometheus is enabled')
  }

  private async collectMetrics(): Promise<void> {
    this.logger.debug('Collecting metrics')
    await this.guildOnlineMetrics.collectMetrics(this.application)
  }
}
