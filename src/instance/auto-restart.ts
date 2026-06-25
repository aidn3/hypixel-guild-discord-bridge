import { uptime } from 'node:process'

import type Application from '../application'
import { ChannelType, Color, InstanceSignalType } from '../common/application-event'
import type { DisplayableInstance } from '../common/instance'
import { Instance } from '../common/instance'
import Duration from '../utility/duration'
import { setIntervalAsync } from '../utility/scheduling'

export default class AutoRestart extends Instance implements DisplayableInstance {
  private static readonly MaxLifeTillRestart = Duration.hours(24)
  private static readonly CheckEvery = Duration.minutes(5)

  constructor(application: Application) {
    super(application, 'auto-restart')

    let shuttingDown = false

    setIntervalAsync(
      async () => {
        if (!this.enabled()) return

        if (shuttingDown) return

        if (AutoRestart.MaxLifeTillRestart.toSeconds() < uptime()) {
          shuttingDown = true

          await this.application.emit('broadcast', {
            ...this.eventHelper.fillBaseEvent(),

            channels: [ChannelType.Public],
            color: Color.Info,

            user: undefined,
            message: 'Application Restarting: Scheduled restart'
          })

          await this.application.signalApplication(InstanceSignalType.Restart)
        }
      },
      {
        delay: AutoRestart.CheckEvery,
        errorHandler: this.errorHandler.promiseCatch('sending signal to restart application')
      }
    )
  }

  public displayName(): string {
    return 'Auto Restart'
  }

  private enabled(): boolean {
    return this.application.core.adminConfigurations.getAutoRestart()
  }
}
