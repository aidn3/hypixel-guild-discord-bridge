import { uptime } from 'node:process'

import { ChannelType, InstanceType, Color } from '../common/application-event.js'
import type { PluginContext, PluginInterface } from '../common/plugins.js'

/* WARNING
THIS PLUGIN IS NOT ESSENTIAL BUT IS HEAVILY RECOMMENDED.
BRIDGE WILL USE MORE RAM THE LONGER IT IS LEFT WITHOUT RESTARTING
*/

const MaxLifeTillRestart = 24 * 60 * 60 // 24 hour in seconds
const CheckEvery = 5 * 60 * 1000 // 5 minutes in milliseconds

export default {
  onRun(context: PluginContext): void {
    let shuttingDown = false

    setInterval(() => {
      if (shuttingDown) return

      if (MaxLifeTillRestart < uptime()) {
        shuttingDown = true

        context.application.emit('broadcast', {
          localEvent: true,

          instanceType: InstanceType.Plugin,
          instanceName: context.pluginName,

          channels: [ChannelType.Public],
          color: Color.Info,

          username: undefined,
          message: 'Application Restarting: Scheduled restart'
        })

        context.application.emit('shutdownSignal', {
          localEvent: true,
          restart: true,
          targetInstanceName: undefined
        })
      }
    }, CheckEvery)
  }
} satisfies PluginInterface
