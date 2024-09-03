import type { AxiosResponse } from 'axios'
import axios from 'axios'

import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance, Status } from '../../common/client-instance.js'

interface Stats {
  id: string

  chatCount: number
  eventsCount: number
  commandsCount: number

  instancesUsed: InstanceType[]
}

export default class StatisticsInstance extends ClientInstance<undefined> {
  private static readonly SEND_EVERY = 5 * 60 * 1000
  private static readonly HOST = 'https://bridge-stats.aidn5.com/metrics'

  private readonly stats: Stats

  private intervalId: NodeJS.Timeout | undefined

  constructor(app: Application, instanceName: string, instancesUsed: InstanceType[]) {
    super(app, instanceName, InstanceType.STATISTICS, undefined)

    this.stats = {
      id: '',
      chatCount: 0,
      commandsCount: 0,
      eventsCount: 0,
      instancesUsed: instancesUsed
    }

    this.app.on('chat', () => this.stats.chatCount++)
    this.app.on('event', () => this.stats.eventsCount++)
    this.app.on('command', () => this.stats.commandsCount++)
  }

  private async send(): Promise<void> {
    await axios
      .post(StatisticsInstance.HOST, this.stats)
      .then((response: AxiosResponse<{ id: string }, unknown>) => response.data)
      .then((response) => {
        this.stats.id = response.id // ID is used to ensure no duplicates entries when sharing metrics
      })
  }

  connect(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId)
    }

    this.intervalId = setInterval(() => {
      void this.send()
    }, StatisticsInstance.SEND_EVERY)

    this.status = Status.CONNECTED
  }
}
