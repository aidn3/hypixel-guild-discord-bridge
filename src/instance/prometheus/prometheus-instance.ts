import assert from 'node:assert'
import http from 'node:http'

import { HttpStatusCode } from 'axios'
import * as Client from 'prom-client'

import type { PrometheusConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'
import Duration from '../../utility/duration.js'
import { Timeout } from '../../utility/timeout.js'

import ApplicationMetrics from './application-metrics.js'
import GuildOnlineMetrics from './guild-online-metrics.js'

export default class PrometheusInstance extends ConnectableInstance {
  private readonly httpServer
  private readonly register

  private readonly applicationMetrics: ApplicationMetrics
  private readonly guildOnlineMetrics: GuildOnlineMetrics

  private readonly config: PrometheusConfig

  constructor(app: Application, config: PrometheusConfig) {
    super(app, 'Prometheus')

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

      const route = request.url.split('?', 1)[0]
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
    this.httpServer.unref()
  }

  private async collectMetrics(): Promise<void> {
    this.logger.debug('Collecting metrics')
    await this.guildOnlineMetrics.collectMetrics(this.application)
  }

  public override async connect(): Promise<void> {
    if (this.currentStatus() === Status.Connected) {
      this.logger.warn('Received connect() signal while already connected. ignoring this signal.')
      return
    } else if (this.currentStatus() === Status.Connecting) {
      this.logger.warn('Received connect() signal while already connecting. ignoring this signal.')
      return
    }

    await this.setAndBroadcastNewStatus(Status.Connecting)
    const listeningTimeout = new Timeout<Error | undefined>(
      Duration.seconds(30).toMilliseconds(),
      new Error('Timed out waiting to start listening')
    )
    const listeningCallback = () => {
      this.logger.debug(`Listening on ${this.config.address}:${this.config.port}`)
      listeningTimeout.resolve(undefined)
    }
    this.httpServer.once('listening', listeningCallback)
    const errorCallback = (error: Error) => {
      listeningTimeout.resolve(error)
    }
    this.httpServer.once('error', errorCallback)

    this.httpServer.listen(this.config.port, this.config.address ?? '0.0.0.0') // 0.0.0.0 address is used by default for backward compatibility
    const listeningResult = await listeningTimeout.wait()
    this.httpServer.removeListener('listening', listeningCallback)
    this.httpServer.removeListener('error', errorCallback)

    if (listeningResult instanceof Error) {
      await this.setAndBroadcastNewStatus(Status.Failed)
      throw listeningResult
    }

    await this.setAndBroadcastNewStatus(Status.Connected)
    this.logger.debug('Prometheus is enabled')
  }

  public override async disconnect(): Promise<void> {
    const currentStatus = this.currentStatus()
    if (currentStatus !== Status.Connected) {
      this.logger.warn(
        `Received signal to disconnect() while not connected. current status=${currentStatus}. ignoring this signal.`
      )
    }

    this.httpServer.close()
    await this.setAndBroadcastNewStatus(Status.Disconnected)
  }
}
