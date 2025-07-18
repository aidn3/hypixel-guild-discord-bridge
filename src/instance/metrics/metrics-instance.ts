import type { AxiosResponse } from 'axios'
import DefaultAxios from 'axios'

import type Application from '../../application.js'
import type { ApplicationEvents } from '../../common/application-event.js'
import { InstanceType } from '../../common/application-event.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'
import { InternalInstancePrefix } from '../../common/instance.js'

interface Stats {
  id: string
  instancesUsed: InstanceType[]
  events: Map<keyof ApplicationEvents, number>
}

export default class MetricsInstance extends ConnectableInstance<InstanceType.Metrics> {
  private static readonly SendEvery = 20 * 60 * 1000
  private static readonly Host = 'https://bridge-stats.aidn5.com/metrics'

  private readonly stats: Stats

  private intervalId: NodeJS.Timeout | undefined

  constructor(app: Application) {
    super(app, InternalInstancePrefix + InstanceType.Metrics, InstanceType.Metrics)

    this.stats = {
      id: '',
      instancesUsed: [],
      events: new Map()
    }

    this.application.on('all', (name) => {
      const count = this.stats.events.get(name) ?? 0
      this.stats.events.set(name, count + 1)
    })
  }

  private async send(): Promise<void> {
    this.logger.debug('collecting anonymous metrics to send')
    this.stats.instancesUsed = this.application.getAllInstancesIdentifiers().map((instance) => instance.instanceType)

    await DefaultAxios.post(MetricsInstance.Host, this.stats)
      .then((response: AxiosResponse<{ id: string }, unknown>) => response.data)
      .then((response) => {
        this.stats.id = response.id // ID is used to ensure no duplicates entries when sharing metrics
      })
  }

  connect(): void {
    this.logger.info('Thank you for enabling metrics!')
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId)
    }

    // TODO: enable metrics back when finished
    this.logger.debug(
      "No metrics will be sent for the time being since the server that is meant to receive the metrics isn't prepared yet."
    )
    /*
        this.intervalId = setInterval(() => {
          void this.send().catch(this.errorHandler.promiseCatch('sending anonymous metrics'))
        }, MetricsInstance.SendEvery)
    */

    this.setAndBroadcastNewStatus(Status.Connected, 'instance ready and will be sending periodical anonymous metrics')
  }

  disconnect(): Promise<void> | void {
    if (this.intervalId === undefined) {
      // TODO: enable metrics back when finished
      // this.logger.warn('Received disconnect() request but instance already disconnected')
    } else {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }

    this.setAndBroadcastNewStatus(Status.Ended, 'instance has stopped')
  }
}
