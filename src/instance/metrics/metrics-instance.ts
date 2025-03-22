import assert from 'node:assert'
import http from 'node:http'

import { HttpStatusCode } from 'axios'
import * as Client from 'prom-client'

import type { MetricsConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'

import ApplicationMetrics from './application-metrics.js'
import GuildOnlineMetrics from './guild-online-metrics.js'

export default class MetricsInstance extends Instance<MetricsConfig, InstanceType.Metrics> {
  private readonly httpServer
  private readonly register

  private readonly applicationMetrics: ApplicationMetrics
  private readonly guildOnlineMetrics: GuildOnlineMetrics

  constructor(app: Application, config: MetricsConfig) {
    super(app, InternalInstancePrefix + InstanceType.Metrics, InstanceType.Metrics, true, config)

    assert(config.enabled)

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

    this.logger.debug(`Listening on port ${this.config.port}`)
    this.httpServer.listen(this.config.port)

    this.logger.debug('prometheus is enabled')
  }

  private async collectMetrics(): Promise<void> {
    this.logger.debug('Collecting metrics')

    if (this.config.useIngameCommand) {
      await this.guildOnlineMetrics.collectMetrics(this.application, this.eventHelper)
    }
  }
}
