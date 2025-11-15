import { uptime } from 'node:process'

import type Application from '../application'
import { ChannelType, Color, InstanceSignalType, InstanceType } from '../common/application-event'
import { Instance, InternalInstancePrefix } from '../common/instance'
import Duration from '../utility/duration'

export default class AutoRestart extends Instance<InstanceType.Utility> {
  private static readonly MaxLifeTillRestart = Duration.hours(24)
  private static readonly CheckEvery = Duration.minutes(5)

  constructor(application: Application) {
    super(application, InternalInstancePrefix + 'auto-restart', InstanceType.Utility)

    let shuttingDown = false

    setInterval(() => {
      if (!this.enabled()) return

      if (shuttingDown) return

      if (AutoRestart.MaxLifeTillRestart.toSeconds() < uptime()) {
        shuttingDown = true

        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Info,

          user: undefined,
          message: 'Application Restarting: Scheduled restart'
        })

        void this.application
          .sendSignal([this.application.instanceName], InstanceSignalType.Restart)
          .catch(this.errorHandler.promiseCatch('sending signal to restart application'))
      }
    }, AutoRestart.CheckEvery.toMilliseconds())
  }

  private enabled(): boolean {
    return this.application.core.applicationConfigurations.getAutoRestart()
  }
}
