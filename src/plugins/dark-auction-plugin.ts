import { ChannelType, Severity, EventType, InstanceType } from '../common/application-event.js'
import type { PluginContext, PluginInterface } from '../common/plugins.js'
import { antiSpamString } from '../util/shared-util.js'

export default {
  onRun(context: PluginContext): void {
    let lastHourCheck = -1
    let lastMinuteCheck = -1

    setInterval(() => {
      const date = new Date()
      const currentHour = date.getHours()
      const currentMinute = date.getMinutes()

      if (lastHourCheck === currentHour && lastMinuteCheck === currentMinute) return
      lastHourCheck = currentHour
      lastMinuteCheck = currentMinute

      if ([50, 54].includes(currentMinute)) {
        context.application.emit('event', {
          localEvent: true,
          instanceType: InstanceType.MAIN,
          instanceName: InstanceType.MAIN,
          eventType: EventType.AUTOMATED,
          severity: Severity.GOOD,
          channelType: ChannelType.PUBLIC,
          username: undefined,
          message: `Dark Auction in ${55 - currentMinute} minutes! @${antiSpamString()}`,
          removeLater: false
        })
      }
    }, 5000)
  }
} satisfies PluginInterface
