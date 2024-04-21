import { uptime } from 'node:process'

import { ChannelType, EventType, InstanceType, Severity } from '../common/application-event.js'
import type { PluginContext, PluginInterface } from '../common/plugins.js'

const MAX_LIFE_TILL_RESTART = 24 * 60 * 60 // 24 hour in seconds
const CHECK_EVERY = 5 * 60 * 1000 // 5 minutes in milliseconds

export default {
  onRun(context: PluginContext): void {
    let shuttingDown = false

    setInterval(() => {
      if (shuttingDown) return

      if (MAX_LIFE_TILL_RESTART < uptime()) {
        shuttingDown = true

        context.application.emit('event', {
          localEvent: true,

          instanceType: InstanceType.PLUGIN,
          instanceName: context.pluginName,

          channelType: ChannelType.PUBLIC,
          severity: Severity.INFO,
          eventType: EventType.AUTOMATED,
          removeLater: false,

          username: undefined,
          message: 'Application Restarting: Scheduled restart'
        })

        context.application.emit('shutdownSignal', {
          localEvent: true,
          restart: true,
          targetInstanceName: undefined
        })
      }
    }, CHECK_EVERY)
  }
} satisfies PluginInterface
