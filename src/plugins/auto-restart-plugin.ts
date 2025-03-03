import { uptime } from 'node:process'

import { ChannelType, Color } from '../common/application-event.js'
import PluginInstance from '../common/plugin-instance.js'

/* WARNING
THIS PLUGIN IS NOT ESSENTIAL BUT IS HEAVILY RECOMMENDED.
BRIDGE WILL USE MORE RAM THE LONGER IT IS LEFT WITHOUT RESTARTING
*/
export default class AutoRestartPlugin extends PluginInstance {
  private static readonly MaxLifeTillRestart = 24 * 60 * 60 // 24 hour in seconds
  private static readonly CheckEvery = 5 * 60 * 1000 // 5 minutes in milliseconds

  onReady(): Promise<void> | void {
    let shuttingDown = false

    setInterval(() => {
      if (shuttingDown) return

      if (AutoRestartPlugin.MaxLifeTillRestart < uptime()) {
        shuttingDown = true

        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Info,

          username: undefined,
          message: 'Application Restarting: Scheduled restart'
        })

        this.application.emit('shutdownSignal', {
          ...this.eventHelper.fillBaseEvent(),

          restart: true,
          targetInstanceName: undefined
        })
      }
    }, AutoRestartPlugin.CheckEvery)
  }
}
